#!/bin/bash
# Handles Model Installation & Runs Ollama in the Background

# Start Ollama in the background
ollama serve &

# Wait for qwen server to start
sleep 5

# Check if the qwen2.5:0.5b model is already present
if ! ollama list | grep -iq "qwen2.5:0.5b"; then
  echo "qwen2.5:0.5b not found, pulling..."
  ollama pull qwen2.5:0.5b
else
  echo "qwen2.5:0.5b already pulled. Skipping download."
fi

# Check if the nomic-embed-text model is already present
if ! ollama list | grep -iq "nomic-embed-text"; then
  echo "nomic-embed-text not found, pulling..."
  ollama pull nomic-embed-text
else
  echo "nomic-embed-text already pulled. Skipping download."
fi

# Keep container running with Ollama
wait