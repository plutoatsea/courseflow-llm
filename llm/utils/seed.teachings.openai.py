import os
from docling.document_converter import DocumentConverter
from docling.chunking import HybridChunker
from pymilvus import MilvusClient
from openai import OpenAI
from dotenv import load_dotenv
import tiktoken

# === 1. Load OpenAI ===
load_dotenv()
client_openai = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# === 2. Tokenizer for OpenAI token limits ===
encoding = tiktoken.encoding_for_model("text-embedding-3-small")

def count_tokens(text):
    return len(encoding.encode(text))

# === 3. Chunker (same as local) ===
from transformers import AutoTokenizer
tokenizer = AutoTokenizer.from_pretrained("BAAI/bge-small-en-v1.5")
tokenizer.model_max_length = 100000

chunker = HybridChunker(
    tokenizer=tokenizer,
    max_tokens=384,
    merge_peers=True,
    min_tokens=128,
    respect_sections=True
)

# === 4. OpenAI Embedding Function ===
def get_embedding(text):
    try:
        response = client_openai.embeddings.create(
            model="text-embedding-3-small",
            input=text,
        )
        return response.data[0].embedding
    except Exception as e:
        print(f"Embedding error: {e}")
        return None

# === 5. File Processing ===
data = []
input_dir = "./data/teachings"

for filename in os.listdir(input_dir):
    path = os.path.join(input_dir, filename)
    if not os.path.isfile(path):
        continue

    try:
        print(f"\nProcessing: {filename}")
        conv_res = DocumentConverter().convert(path)
        doc = conv_res.document
        chunks = list(chunker.chunk(dl_doc=doc))
        print(f" - {len(chunks)} chunks")

        for i, chunk in enumerate(chunks):
            # Safely extract chunk text
            text = getattr(chunk, "text", None)
            if not text or count_tokens(text) > 8192:
                continue

            meta = getattr(chunk, "meta", {})
            headings = getattr(meta, "headings", [])
            vector = get_embedding(text)

            if vector:
                data.append({
                    "id": int(hash(f"{filename}-{i}") & 0x7FFFFFFF),
                    "vector": vector,
                    "text": text,
                    "heading": " > ".join(headings) if headings else None,
                    "page_no": getattr(meta, "page_no", None),
                    "source": filename
                })

    except Exception as e:
        print(f"Error processing {filename}: {e}")

# === 6. Milvus Insertion ===
client = MilvusClient("./courseflow_rag.db")
collection_name = "teachings_openai"

if collection_name in client.list_collections():
    client.drop_collection(collection_name)

dimension = len(data[0]["vector"]) if data else 1536

client.create_collection(
    collection_name=collection_name,
    dimension=dimension,
    metric_type="COSINE"
)

if data:
    client.insert(collection_name=collection_name, data=data)
    print(f"Inserted {len(data)} chunks.")
else:
    print("No embeddings generated.")