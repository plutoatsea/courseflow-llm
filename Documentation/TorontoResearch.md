## UToronto Projects Research

### Project 1

Links for Code:
- CK Ideas frontend: https://github.com/encorelab/ck-board/blob/develop/frontend/src/app/components/ck-ideas/ck-ideas.component.ts
- Vertex AI backend service: https://github.com/encorelab/ck-board/blob/develop/backend/src/services/vertexAI/index.ts
- Here is the README that includes partial instructions for getting an API key from vertex AI once you have an account and setup billing: https://github.com/encorelab/ck-board

CK Ideas tool with AI Summary and AI Chat

*"This tool summaries student posts based on the given topic context and the specified group of student posts and allows the teacher to ask questions about the student posts."*

Steps that were used for integrating an AI Chat Box 

(Mock Examples Used According to Original Description)

**1. Create a Payload**

The idea is to collect as much of information as possible about the student posts so that the AI knows what content should be inspected as context.
```json
[
  {
    "post_id": "p001",
    "content": "Photosynthesis uses sunlight.",
    "bucket_id": "b001",
    "bucket_name": "Biology - A",
    "upvotes": 5,
    "author": "Alice"
  },
  {
    "post_id": "p002",
    "content": "Plants absorb sunlight to grow.",
    "bucket_id": "b001",
    "bucket_name": "Biology - A",
    "upvotes": 3,
    "author": "Bob"
  }
]
```

**2. Clean the Payload**

The idea is to shorten the payload to make it model friendly. For instance:
```json
[
  ["p1", "Photosynthesis uses sunlight.", "Alice", 5],
  ["p2", "Plants absorb sunlight to grow.", "Bob", 3]
]
```

**3. Configure the Model & Construct the Prompt Template**

- **AI Persona** : Mentions a way to provide context to a LLM Model

    ```
    Example of starting prompt: 
    "You are an educational assistant helping summarize student ideas for teachers."
    ```
- **Task** : Task that mentions what the LLM needs to be done.
    ```
    Example of prompt: 
    "Summarize the ideas in the following student posts and suggest one follow-up question for discussion."
    ```
- **Output Format** : Instructs LLM To provide a specific output format.
    ```
    ex: {
    "summary": "...",
    "follow_up_question": "..."
    }
    ```

**4. Validate JSON Response**

If the model responds with for instance:

```
{
"summary": "Students understand that sunlight is essential for plant growth and photosynthesis.",
"follow_up_question": "Why is sunlight necessary for photosynthesis?"
}
``` 

Add validation to check output.

**5. Parse and Handle the Response**
- Parse to markdown formatting and display or
- Perform database actions (i.e., move post to new bucket)

### Project 2

Links


- [Code generation](https://github.com/encorelab/ai-theme-analyser/blob/main/src/code_generation.py)

- [Code merging](https://github.com/encorelab/ai-theme-analyser/blob/main/src/code_merger_client.py)

- [Intensity code generation](https://github.com/encorelab/ai-theme-analyser/blob/main/src/intensity_generation.py)

- [Theme generation](https://github.com/encorelab/ai-theme-analyser/blob/main/src/theme_generator.py)

- [Written summary generation](https://github.com/encorelab/ai-theme-analyser/blob/main/src/theme_summary_client.py)

- [Similar but uses Google Cloud CLI & API](https://github.com/encorelab/ai-theme-analyser)

The first project is a NodeJS project that illustrates integration into a web app and the second is a simpler python script. The second project is definitely a simpler structure and illustrates the process of creating a payload (i.e., existing themes and codes, and text to analyze), composing a prompt template, requesting a json response, then parsing variables from the json response. 