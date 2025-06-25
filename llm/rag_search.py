# Searching functionnality for RAG
# Translates Embeddings inside the MilbusDB and Feeds To AI
from pymilvus import MilvusClient
import requests
import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

# Initialize clients
client_port = os.getenv("LLM_PORT", "11434")
client_openai = OpenAI(api_key=os.getenv("OPENAI_API_KEY")) # Assuming API key is available

client_milvus = MilvusClient("./courseflow_rag.db")
# Define collections for different models
LOCAL_EMBEDDING_COLLECTIONS = ["teachings", "outlines"]
OPENAI_EMBEDDING_COLLECTIONS = ["teachings_openai"]

# Configuration for the embedding model used in RAG search
RAG_EMBEDDING_MODEL = os.getenv("RAG_EMBEDDING_MODEL", "nomic-embed-text")

def get_embedding(text: str, model_name: str):
    """
    Generates an embedding for the given text using the specified model.
    Supports local Ollama models (e.g., nomic-embed-text) and OpenAI models.
    """
    if model_name == "text-embedding-3-small": # Assuming OpenAI model
        try:
            # Use the pre-initialized OpenAI client
            response = client_openai.embeddings.create(
                model=model_name,
                input=text,
            )
            return response.data[0].embedding
        except Exception as e:
            print(f"OpenAI Embedding error with {model_name}: {e}")
            return None
    else: # Assuming local Ollama model
        try:
            response = requests.post(
                'http://' + os.getenv("HOST", "localhost") + ':' + client_port+'/api/embeddings',
                json={"model": model_name, "prompt": text},
                timeout=30
            )
            response.raise_for_status()
            return response.json()["embedding"]
        except Exception as e:
            print(f"Ollama Embedding error with {model_name}: {e}")
            return None

def query_rag_context(query: str, user_id: str, model_name:str, top_k_user: int = 6, top_k_teacher: int = 2):
    # Ensure consistent embedding model usage
    embed_model = RAG_EMBEDDING_MODEL
    if model_name == "qwen":
        embed_model = 'nomic-embed-text'
    
    query_vector = get_embedding(query, model_name=embed_model)
    if not query_vector:
        return []

    # Get vector dimension for validation
    vector_dim = len(query_vector)
    
    user_collection = "openaiusers" if embed_model == "text-embedding-3-small" else "ollamausers"
    teaching_collections = OPENAI_EMBEDDING_COLLECTIONS if embed_model == "text-embedding-3-small" else LOCAL_EMBEDDING_COLLECTIONS

    user_results = []
    teaching_results = []

    # Search user collection
    if client_milvus.has_collection(collection_name=user_collection):
        user_search = client_milvus.search(
            collection_name=user_collection,
            data=[query_vector],
            limit=top_k_user,
            output_fields=["text", "heading", "page_no", "source"],
            search_params={"metric_type": "COSINE", "params": {"nprobe": 16}},
            filter=f'user_id == "{user_id}"'
        )

        for match in user_search[0]:
            entity = match['entity']
            user_results.append({
                "text": entity['text'],
                "heading": entity.get('heading'),
                "page_no": entity.get('page_no'),
                "source": entity.get('source'),
                "score": match.score,
                "collection": user_collection,
                "result_type": "user_content"
            })
    else:
        print(f"User collection '{user_collection}' does not exist in Milvus.")

    # Search teaching collections
    for col in teaching_collections:
        if client_milvus.has_collection(collection_name=col):
            teach_search = client_milvus.search(
                collection_name=col,
                data=[query_vector],
                limit=top_k_teacher,
                output_fields=["text", "heading", "page_no", "source"],
                search_params={"metric_type": "COSINE", "params": {"nprobe": 16}}
            )

            for match in teach_search[0]:
                entity = match['entity']
                teaching_results.append({
                    "text": entity['text'],
                    "heading": entity.get('heading'),
                    "page_no": entity.get('page_no'),
                    "source": entity.get('source'),
                    "score": match.score,
                    "collection": col,
                    "result_type": "teaching_content"
                })
        else:
            print(f"Teaching collection '{col}' does not exist in Milvus.")

    return {
        "user_content": user_results[:top_k_user],
        "teaching_content": teaching_results[:top_k_teacher]
    }