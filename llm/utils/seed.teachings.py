import os
from docling.document_converter import DocumentConverter
from docling.chunking import HybridChunker
from pymilvus import MilvusClient
import requests
from transformers import AutoTokenizer

# === 1. Initialize Tokenizer and Chunker ===
tokenizer = AutoTokenizer.from_pretrained("BAAI/bge-small-en-v1.5")
tokenizer.model_max_length = 100000

chunker = HybridChunker(
    tokenizer=tokenizer,
    max_tokens=384,
    merge_peers=True,
    min_tokens=128,
    respect_sections=True
)

# === 2. Embedding Function ===
def get_embedding(text):
    try:
        response = requests.post(
            "http://localhost:11434/api/embeddings",
            json={"model": "nomic-embed-text", "prompt": text},
            timeout=30
        )
        response.raise_for_status()
        return response.json()["embedding"]
    except Exception as e:
        print(f"Embedding error: {e}")
        return None

# === 3. Loop Over Files ===
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
            text = chunk.text
            meta = chunk.meta if hasattr(chunk, 'meta') else {}
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

# === 4. Milvus Insertion ===
client = MilvusClient("./courseflow_rag.db")
collection_name = "teachings"

if collection_name in client.list_collections():
    client.drop_collection(collection_name)

if not data:
    print("No embeddings generated.")
    dimension = 768
else:
    dimension = len(data[0]["vector"])

client.create_collection(
    collection_name=collection_name,
    dimension=dimension,
    metric_type="COSINE"
)

if data:
    client.insert(collection_name=collection_name, data=data)
    print(f"Inserted {len(data)} chunks.")