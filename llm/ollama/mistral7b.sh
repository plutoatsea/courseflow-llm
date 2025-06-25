#!/bin/bash
# Handles Model Installation & Runs Ollama in the Background

# Start Ollama in the background
ollama serve &

# Wait for Mistral server to start
sleep 5

# Check if the mistral:7b model is already present
if ! ollama list | grep -iq "mistral:7b"; then
  echo "mistral:7b not found, pulling..."
  ollama pull mistral:7b
else
  echo "mistral:7b already pulled. Skipping download."
fi

# Keep container running with Ollama
wait