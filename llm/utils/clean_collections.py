from pymilvus import MilvusClient
import os

DB_PATH = "./courseflow_rag.db"
COLLECTIONS_TO_KEEP = ["teachings", "teachings_openai"]

try:
    if not os.path.exists(DB_PATH):
        print(f"Error: Database file not found at {DB_PATH}")
    else:
        client = MilvusClient(DB_PATH)
        all_collections = client.list_collections()
        print(f'All collections: {all_collections}')

        collections_to_delete = [col for col in all_collections if col not in COLLECTIONS_TO_KEEP]
        print(f'Collections to delete: {collections_to_delete}')

        for col in collections_to_delete:
            print(f'Deleting collection: {col}')
            client.drop_collection(collection_name=col)
            print(f'Collection {col} deleted.')

        print('Finished checking collections.')

except ModuleNotFoundError:
    print("Error: The 'pymilvus' library is not installed.")
    print("Please install it using 'pip install pymilvus'.")
except Exception as e:
    print(f"An error occurred: {e}") 