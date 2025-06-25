# GenerativeAI & Technologies Research

## Video/Tutorials

- **Title**: HuggingFace + Langchain | Run 1,000s of FREE AI Models Locally

    **Link**: https://www.youtube.com/watch?v=1h6lfzJ0wZw


- **Title**: LangChain Explained In 15 Minutes - A MUST Learn For Python Programmers

    **Link**: https://www.youtube.com/watch?v=mrjq3lFz23s

- **Title**: Run any AI model remotely for free on google colab
    
    **Link**: https://www.youtube.com/watch?v=Qa1h7ygwQq8

- **Title**: *(Not using django but similar concepts)* How To Build an API with Python (LLM Integration, FastAPI, Ollama & More)

    **Link**: https://www.youtube.com/watch?v=cy6EAp4iNN4

- **Title**: How to run Ollama on Docker

    **Link**: https://www.youtube.com/watch?v=ZoxJcPkjirs&t=262s

## Tools

**Title**: Google Colab

**Link**: https://colab.google/

*"Colab is a hosted Jupyter Notebook service that requires no setup to use and provides free access to computing resources, including GPUs and TPUs. Colab is especially well suited to machine learning, data science, and education."*

**Use Case**: Taking Notes (Notebook), Has a Python Environment (Built-in the Cloud and Free), Free Access to NVIDIA GPUs **(Low Compute Costs for Free!).** Content on the colabs could be shared.

---

**Title**: Docling

**Link**: https://github.com/docling-project/docling?tab=MIT-1-ov-file
	
*"Docling simplifies document processing, parsing diverse formats — including advanced PDF understanding — and providing seamless integrations with the gen AI ecosystem."*

**Use Case:**  Prepare files for RAG & Fine Tuning - Converts PDF, DOCX, XLSX, HTML, images, and more to Markdown, HTML, and lossless JSON.

**Licence**: MIT

[Example Usage](https://docling-project.github.io/docling/examples/minimal/)

[Demo](https://www.youtube.com/watch?v=BWxdLm1KqTU)

---

**Title**: LangChain

**Link**: https://python.langchain.com/docs/introduction/

*"LangChain is a framework for developing applications powered by large language models (LLMs)."*

**Use Case:**
question answering over documents, chatbot development with memory, agent-based reasoning with tool use, structured text generation pipelines, code and data analysis using LLMs, multi-step workflows with chained LLM calls.

*\*Compatible with Docling*

---

**Title**: FastAPI (Framework)

**Link**: https://fastapi.tiangolo.com/

*"FastAPI is a modern, fast (high-performance), web framework for building APIs with Python based on standard Python type hints."*

**Use Case:** For Server-side if we want to add fast APIs.

---

**Title**: Milvus (Vector Database)

**Link**: https://milvus.io/

*"Milvus is an open-source vector database built for GenAI applications. Install with pip, perform high-speed searches, and scale to tens of billions of vectors with minimal performance loss."*

**Use Case:** Store Vector Embeddings for RAG.

---

## Large Language Models (LLM)

**Name**: llava-phi3:3.5b

**Features**: Analyse a given image. Conversations are supported. Takes at least ~1GiB of RAM. Takes less space and faster to download. From what I tested, I provided a picture from the CourseFlow Diagram and the LLM guesses the relationships between the courses accurately.

**Link**: https://www.ollama.com/library/llava-phi3:3.8b

**Licence**: MIT (Model was fine-tuned from phi) https://huggingface.co/microsoft/Phi-3-mini-4k-instruct

**Details**
```
Model
    architecture        llama     
    parameters          3.8B      
    context length      4096      
    embedding length    3072      
    quantization        Q4_K_M    

  Projector
    architecture        clip       
    parameters          303.50M    
    embedding length    1024       
    dimensions          768        

  Parameters
    num_ctx     4096               
    num_keep    4                  
    stop        "<|user|>"         
    stop        "<|assistant|>"    
    stop        "<|system|>"       
    stop        "<|end|>"          
    stop        "<|endoftext|>" 

  Template
    {{ if .System }}<|system|>
    {{ .System }}<|end|>
    {{ end }}{{ if .Prompt }}<|user|>
    {{ .Prompt }}<|end|>
    {{ end }}<|assistant|>
    {{ .Response }}<|end|>

```

---

**Name**: mistral:7b

**Features**: Text to Text LLM. Requires ~0.4-0.5 GiB of RAM. Big Context Length 32K. 

**Link**: https://www.ollama.com/library/mistral:7b

**Licence**: Apache 2.0

**Details**

```
Model
    architecture        llama    
    parameters          7.2B     
    context length      32768    
    embedding length    4096     
    quantization        Q4_0     

  Parameters
    stop    "[INST]"     
    stop    "[/INST]"    

  License
    Apache License               
    Version 2.0, January 2004 

  Template
    {{- if .Messages }}
    {{- range $index, $_ := .Messages }}
    {{- if eq .Role "user" }}
    {{- if and (eq (len (slice $.Messages $index)) 1) $.Tools }}[AVAILABLE_TOOLS] {{ $.Tools }}[/AVAILABLE_TOOLS]
    {{- end }}[INST] {{ if and $.System (eq (len (slice $.Messages $index)) 1) }}{{ $.System }}

    {{ end }}{{ .Content }}[/INST]
    {{- else if eq .Role "assistant" }}
    {{- if .Content }} {{ .Content }}
    {{- else if .ToolCalls }}[TOOL_CALLS] [
    {{- range .ToolCalls }}{"name": "{{ .Function.Name }}", "arguments": {{ .Function.Arguments }}}
    {{- end }}]
    {{- end }}</s>
    {{- else if eq .Role "tool" }}[TOOL_RESULTS] {"content": {{ .Content }}} [/TOOL_RESULTS]
    {{- end }}
    {{- end }}
    {{- else }}[INST] {{ if .System }}{{ .System }}

    {{ end }}{{ .Prompt }}[/INST]
    {{- end }} {{ .Response }}
    {{- if .Response }}</s>
    {{- end }}

```

---

**Name**: BAAI/bge-small-en-v1.5 (Chunk/Token Splitter)

**Features**: The bge-small-en model can be a useful tool for a variety of applications that involve working with English text data. For example, you could use it to build a semantic search engine for your company's knowledge base, or to improve the text classification capabilities of your customer support chatbot.

**Link**: https://huggingface.co/BAAI/bge-small-en-v1.5 

**Licence**: MIT

---

**Name**: `nomic-embed-text` (embedding model for RAG)

**Features**: `nomic-embed-text` is a large context length text encoder that surpasses OpenAI `text-embedding-ada-002` and `text-embedding-3-small` performance on short and long context tasks.

**Link**: https://ollama.com/library/nomic-embed-text

**Licence**: Apache 2.0
