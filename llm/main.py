from fastapi import FastAPI, Depends, HTTPException, Header, UploadFile, File, Form, Query
from pydantic import BaseModel
from ollama import Client
import os, re
from dotenv import load_dotenv
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from rag_search import query_rag_context
from docling.document_converter import DocumentConverter
from docling_core.transforms.chunker.hybrid_chunker import HybridChunker
from pymilvus import MilvusClient
from transformers import AutoTokenizer
import tempfile
import shutil
import requests
import openai
import tiktoken
from openai import OpenAI
from pypdf import PdfReader

load_dotenv()

client_openai = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
client_port = os.getenv("LLM_PORT")

# Assigns Local Machine Ollama Port If not found in ENV
if not client_port:
    client_port = "11434"

client = Client(host='http://' + os.getenv("HOST") + ':' + client_port)

# Total Amount of Credits (5) For Using LLM.
API_KEY_CREDITS = {os.getenv("API_KEY") : 5}

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["x-api-key"]
)

tokenizer = tiktoken.get_encoding("cl100k_base")
MAX_TOKENS = 256

chunker = HybridChunker(
    max_tokens=MAX_TOKENS,
    merge_peers=True,
    min_tokens=128,
    respect_sections=True
)

# Avoid using RAG gibberish to influence my response
def is_gibberish(text: str) -> bool:
    if not text.strip():
        return True
    if len(text.strip()) < 10:
        return True
    # >50% nonword characters
    if len(re.sub(r'[\w\s]', '', text)) / len(text) > 0.5:
        return True
    return False

def get_embedding(text: str, model_name: str = "nomic-embed-text"):
    """
    Generates an embedding for the given text using the specified model.
    Supports OPENAI & Ollama Models
    """
    # Truncate text to prevent token overflow
    if model_name != "text-embedding-3-small" and len(text) > 512:
        text = text[:512]
    
    if model_name == "text-embedding-3-small":
        try:
            response = client_openai.embeddings.create(
                model=model_name,
                input=text,
            )
            return response.data[0].embedding
        except Exception as e:
            print(f"OpenAI Embedding error with {model_name}: {e}")
            return None
    else:
        try:
            response = requests.post(
                'http://' + os.getenv("HOST") + ':' + client_port+'/api/embeddings',
                json={"model": model_name, "prompt": text},
                timeout=30
            )
            response.raise_for_status()
            return response.json()["embedding"]
        except Exception as e:
            print(f"Ollama Embedding error with {model_name}: {e}")
            return None

# Health Check Server-Side
@app.get("/health")
def health_check():
    """
    Simple endpoint to check if the server is running.
    """
    return {"status": "ok"}

# Verify that API_KEY has enough Credits or Valid
def verify_api_key(x_api_key: str = Header(None)):
    """
    Verify the API key passed in headers and ensure it has credits left.
    """
    credits = API_KEY_CREDITS.get(x_api_key, 0)
    if credits <= 0:
        raise HTTPException(status_code=401, detail="Invalid API Key, or no credits")
    return x_api_key

# Request is expected to be a JSON {"prompt":str, "model":"qwen/o3-mini", "user_id"}
class PromptRequest(BaseModel):
    prompt: str
    model: str = "qwen"
    user_id: str

# Generates a response from a prompt
@app.post(
    "/generate",
    tags=["Chat"],
    summary="Generate a response from prompt",
    description="Takes a prompt string and returns a single completion from the LLM.",
    response_description="Generated text from the model."
)
def generate(request: PromptRequest, x_api_key: str = Depends(verify_api_key)):
    """
    Accepts a prompt and returns a single generated response from the qwen/mistral/o3-mini model.
    """
    # Removing credits on every use (Uncomment later)
    # API_KEY_CREDITS[x_api_key] -= 1
    context_result = query_rag_context(request.prompt, request.user_id, request.model, top_k_user=6, top_k_teacher=2)
    all_chunks = context_result["user_content"] + context_result["teaching_content"]

    filtered_chunks = [c for c in all_chunks if not is_gibberish(c["text"])]
    context_text = "\n\n".join(
        f"### Source: {c['collection']} | Page {c['page_no']} | Heading: {c['heading']}\n{c['text']}" 
        for c in filtered_chunks
    ) if filtered_chunks else "No relevant context found."

    # Compose final prompt
    final_prompt = f"""You are a helpful assistant with access to context documents.
    Use the following context to answer the user query.

    Context:
    {context_text}

    Question: {request.prompt}
    Answer:"""

    model = request.model.lower()

    if model == "o3-mini":
        try:
            response = client_openai.chat.completions.create(
                model="o3-mini",
                messages=[
                    {"role": "system", "content": "You are an assistant that answers with relevant Markdown formatting."},
                    {"role": "user", "content": final_prompt}
                ]
            )
            content = response.choices[0].message.content
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"OpenAI API Error: {str(e)}")
    elif model == "qwen":
        try:
            response = client.chat(
                model="qwen2.5:0.5b",
                messages=[
                    {"role": "system", "content": "You are an assistant that answers with relevant Markdown formatting."},
                    {"role": "user", "content": final_prompt}
                ]
            )
            content = response["message"]["content"]
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Ollama Error: {str(e)}")

    else:
        raise HTTPException(status_code=400, detail="Invalid model. Use 'qwen' or 'o3-mini'.")
    
    return {
        "response": content,
        "context": [
            {
                "source": c.get("source"),
                "text": c.get("text")
            } for c in filtered_chunks
        ]
    }

def split_text_by_tokens(text, max_tokens=MAX_TOKENS):
    tokens = tokenizer.encode(text)
    for i in range(0, len(tokens), max_tokens):
        yield tokenizer.decode(tokens[i:i + max_tokens])

def split_chunks_by_token_limit(chunks, max_tokens=MAX_TOKENS):
    """Ensure all chunks are within token limit"""
    new_chunks = []
    for chunk in chunks:
        tokens = tokenizer.encode(chunk["text"])
        if len(tokens) <= max_tokens:
            new_chunks.append(chunk)
        else:
            for i in range(0, len(tokens), max_tokens):
                new_text = tokenizer.decode(tokens[i:i + max_tokens])
                new_meta = chunk["meta"].copy()
                new_chunks.append({
                    "text": new_text,
                    "meta": new_meta
                })
    return new_chunks

@app.post(
    "/upload",
    tags=["RAG"],
    summary="Upload files to DB",
    description="User uploads a file so that it is parsed and saved in the DB",
    response_description="Response is Successful or Failed"
)
def upload(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    source: str = Form(...),
    embedding_model: str = Form(...),
    x_api_key: str = Depends(verify_api_key)
):
    tmp_path = None
    milvus_client = None

    try:
        # === 1. Save uploaded file to a temp location ===
        with tempfile.NamedTemporaryFile(delete=False, suffix=file.filename) as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name

        chunks = []

        if file.filename.lower().endswith('.pdf'):
            try:
                reader = PdfReader(tmp_path)
                for i, page in enumerate(reader.pages):
                    page_text = page.extract_text()
                    if page_text and page_text.strip():
                        for chunk_text in split_text_by_tokens(page_text, max_tokens=MAX_TOKENS):
                            if chunk_text.strip():
                                chunks.append({
                                    "text": chunk_text,
                                    "meta": {
                                        "source": source,
                                        "page_no": i + 1
                                    }
                                })
                print(f"Used PyPDF + token splitting for PDF: {file.filename}")
            except Exception as e:
                print(f"PyPDF failed: {str(e)}")
                raise HTTPException(500, "PDF processing failed")
        else:
            try:
                conv_res = DocumentConverter().convert(tmp_path)
                doc = conv_res.document
                doc_chunks = list(chunker.chunk(dl_doc=doc))
                
                # Convert DocChunk to dict format with proper metadata handling
                for chunk in doc_chunks:
                    # Safely extract metadata with fallbacks
                    meta = {}
                    if hasattr(chunk, 'metadata'):
                        if isinstance(chunk.metadata, dict):
                            meta = chunk.metadata
                        else:
                            # Handle case where metadata is an object with attributes
                            meta = {
                                'headings': getattr(chunk.metadata, 'headings', []),
                                'page_no': getattr(chunk.metadata, 'page_no', 1)
                            }
                    
                    chunks.append({
                        "text": chunk.text,
                        "meta": {
                            "source": source,
                            "headings": meta.get('headings', []),
                            "page_no": meta.get('page_no', 1)
                        }
                    })
                print(f"Used DocumentConverter for {file.filename}")
            except Exception as e:
                print(f"DocumentConverter failed: {str(e)}")
                try:
                    # Try reading as text
                    with open(tmp_path, 'r', encoding='utf-8') as f:
                        text = f.read()
                    for chunk_text in split_text_by_tokens(text, max_tokens=MAX_TOKENS):
                        if chunk_text.strip():
                            chunks.append({
                                "text": chunk_text,
                                "meta": {
                                    "source": source
                                }
                            })
                except:
                    # Final fallback - read as binary
                    with open(tmp_path, 'rb') as f:
                        text = f.read().decode('utf-8', errors='replace')
                    for chunk_text in split_text_by_tokens(text, max_tokens=MAX_TOKENS):
                        if chunk_text.strip():
                            chunks.append({
                                "text": chunk_text,
                                "meta": {
                                    "source": source
                                }
                            })

        # Standardize chunk format and ensure token limits
        processed_chunks = []
        for chunk in chunks:
            if isinstance(chunk, dict):
                processed_chunks.append(chunk)
            else:  # Handle DocChunk objects
                try:
                    meta = {}
                    if hasattr(chunk, 'metadata'):
                        if isinstance(chunk.metadata, dict):
                            meta = chunk.metadata
                        else:
                            meta = {
                                'headings': getattr(chunk.metadata, 'headings', []),
                                'page_no': getattr(chunk.metadata, 'page_no', 1)
                            }
                    
                    processed_chunks.append({
                        "text": chunk.text,
                        "meta": {
                            "source": source,
                            "headings": meta.get('headings', []),
                            "page_no": meta.get('page_no', 1)
                        }
                    })
                except AttributeError:
                    processed_chunks.append({
                        "text": str(chunk),
                        "meta": {"source": source}
                    })
        
        # Final token length check
        chunks = split_chunks_by_token_limit(processed_chunks, max_tokens=MAX_TOKENS)

        if not chunks:
            raise HTTPException(500, "No content extracted from file")

        # === 3. Generate embeddings ===
        texts = [chunk["text"] for chunk in chunks]
        embeddings = []

        if "text-embedding-3-small" in embedding_model.lower():
            try:
                response = client_openai.embeddings.create(
                    model=embedding_model,
                    input=texts
                )
                embeddings = [record.embedding for record in response.data]
            except Exception as e:
                raise HTTPException(502, f"OpenAI embedding failed: {str(e)}")
        else:
            for text in texts:
                embedding = get_embedding(text, model_name=embedding_model)
                if not embedding:
                    raise HTTPException(502, "Local embedding generation failed")
                embeddings.append(embedding)

        # === 4. Prepare Milvus insert data ===
        collection_name = "ollamausers" if "nomic" in embedding_model.lower() else "openaiusers"

        data = []
        for idx, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            text = chunk["text"]
            meta = chunk.get("meta", {})
            
            data.append({
                "id": int(hash(f"{source}-{idx}") & 0x7FFFFFFF),
                "vector": embedding,
                "user_id": user_id,
                "text": text,
                "heading": " > ".join(meta.get("headings", [])),
                "page_no": meta.get("page_no", 1),
                "source": source
            })

        # === 5. Milvus Connection ===
        milvus_client = MilvusClient("./courseflow_rag.db")

        if collection_name not in milvus_client.list_collections():
            milvus_client.create_collection(
                collection_name=collection_name,
                dimension=len(embeddings[0]),
                metric_type="COSINE"
            )

        existing = milvus_client.query(
            collection_name=collection_name,
            filter=f'user_id == "{user_id}" and source == "{source}"',
            limit=1
        )
        if existing:
            raise HTTPException(409, f"Source '{source}' already exists for this user")

        milvus_client.insert(
            collection_name=collection_name,
            data=data
        )

        return {
            "status": "success",
            "chunks": len(data),
            "collection": collection_name,
            "source": source
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Upload failed: {str(e)}")
        raise HTTPException(500, f"Upload processing failed: {str(e)}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
        if milvus_client:
            milvus_client.close()

@app.get(
    "/files",
    tags=["RAG"],
    summary="Fetch all available files from the DB",
    description="Retrieving all files from the users will be useful.",
    response_description="Array with file names and info"
)
def files(
    user_id: str = Query(..., description="User ID to filter files"),
    collection: str = Query(..., description="Collection name to search"),
    x_api_key: str = Depends(verify_api_key)
):
    try:
        client = MilvusClient("./courseflow_rag.db")
        # Check if collection exists
        if collection not in client.list_collections():
            raise HTTPException(status_code=404, detail=f"Collection '{collection}' not found.")
        
        results = client.query(
            collection_name=collection,
            filter=f'user_id == "{user_id}"',
            output_fields=["source"]
        )

        # Extract unique document sources
        sources = list({res['source'] for res in results if 'source' in res})

        return [{"source": src} for src in sources]

    except Exception as e:
        print(f"Files route error: {e}")
        raise HTTPException(status_code=500, detail=f"Fetching files failed: {str(e)}")

@app.delete(
    "/delete",
    tags=["RAG"],
    summary="Delete specific source from Milvus DB",
    description="Deletes all entries for a given user_id and source from the specified collection.",
    response_description="Status of deletion"
)
def delete_source(
    x_api_key: str = Depends(verify_api_key),
    collection_name: str = Query(..., description="Milvus collection name"),
    user_id: str = Query(..., description="User ID"),
    source: str = Query(..., description="Source name to delete")
):
    try:
        client = MilvusClient("./courseflow_rag.db")
        
        delete_expr = f'user_id == "{user_id}" && source == "{source}"'
        
        result = client.delete(
            collection_name=collection_name,
            filter=delete_expr
        )

        delete_count = len(result) if isinstance(result, list) else 0
        
        if delete_count > 0:
            return {
                "status": "success",
                "message": (
                    f"Successfully deleted {delete_count} entries "
                    f"for source '{source}' by user '{user_id}' "
                    f"from collection '{collection_name}'."
                )
            }
        else:
            return {
                "status": "success",
                "message": (
                    f"No entries found for source '{source}' by user '{user_id}' "
                    f"in collection '{collection_name}'."
                )
            }

    except Exception as e:
        print(f"Deletion error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Deletion failed: {str(e)}"
        )