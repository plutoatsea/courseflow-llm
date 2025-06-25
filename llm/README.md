<div align="center">

<h1>FlowChat</h1>
A Fast and Flexible Few-shot Educational Assistant Built for CourseFlow<br><br>

[![madewithlove](https://img.shields.io/badge/made_with-%E2%9D%A4-red?style=for-the-badge&labelColor=orange)](https://gitlab.com/courseflow/llm#)

<a href="https://courseflow.ca/" target="_blank"><img src='https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQefhO7ftcMeSRkCLyF8MWGV8tubp5KSxuu4g&s' style="width: 55px; height: 55px;" width="55" height="55"/></a>

[![License](https://img.shields.io/badge/LICENSE-Apache-green.svg?style=for-the-badge)](https://gitlab.com/courseflow/llm/-/blob/main/LICENSE)

</div>

---

## Setup Production Environment

**Execute the following inside the project repo**:

*Secrets*
```
echo -e 'API_KEY="secret"\nOPENAI_API_KEY=<key>\nRAG_EMBEDDING_MODEL="text-embedding-3-small"' > .env
```

*Database* - **Contains all 190 documents about teaching for OPENAI & LOCAL RAG Search**
```
tar -xzf ./db/db.tar.gz -C ./
```

*Run Docker Compose*
```
docker compose up
```
**FYI**: Might take a while to download ollama models. If you don't want to install ollama models and stick to OpenAI, just comment out the ollama job in the docker compose.

## Setup Dev Environment

Python Version: **3.11**

*Local LLM Installation*

- `curl -fsSL https://ollama.com/install.sh | sh`
- `ollama pull qwen2.5:0.5b`
- `ollama pull nomic-embed-text`

    **(OPTIONAL) SKIP** -  *Build & Run a Docker Container* 

    *This step is only if we want to test the contained llm*
    - `cd ollama`
    - `docker build -f qwen.Dockerfile -t qwen:latest .`
    - `docker run -p 11435:11434 qwen:latest`

    - **Don't forget** to add `LLM_PORT=11435` inside the `.env` and delete it (when done testing)

*Environment*

1. `python -m venv venv`
2. `source ./venv/bin/activate`

*Dependencies*

3. `pip install -r requirements.txt`

*Secrets*

4. `echo -e 'API_KEY="secret"\nHOST="localhost"\nOPENAI_API_KEY=<key>\nRAG_EMBEDDING_MODEL="text-embedding-3-small"' > .env`

*Database* - **Contains all 190 documents about teaching for OPENAI & LOCAL RAG Search**
```
tar -xzf ./db/db.tar.gz -C ./
```
**FYI** - **ATTEMPT AT YOUR OWN RISK**: If you want to manually seed all the 190 files inside /data, use `utils/seed.teachings.py` & `utils/seed.teachings.py` so that openai & local model embeddings can read the vectors. Depending on the network and the system, it might take **~3 hours** to complete both.

*Test API Server*

5. `uvicorn main:app --reload --port 5005`

    **--reload** : Reloads the server when a change has been made in the code.

6. `http://127.0.0.1:5005/docs`

    **/docs :** FastAPI has a Built-In Swagger Documentation.

    *Using Curl*
    ```
    curl -X POST http://localhost:5005/generate \
        -H "Content-Type: application/json" \
        -H "x-api-key: secret" \
        -d '{"prompt": "hello",  "model": "o3-mini"}'
    ```
    - This curl command manually executes the generation command.
    ```
     curl -X POST http://localhost:5005/upload \
           -H "x-api-key: secret" \
           -F "file=@./file.pdf" \
           -F "user_id=abc123" \
           -F "source=cat2.pdf"
    ```
    - This curl command is supposed to test the upload feature. (Might take longer to load because the model is installing)