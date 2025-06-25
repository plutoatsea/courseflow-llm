FROM ollama/ollama@sha256:96b7667cb536ab69bfd5cc0c2bd1e29602218e076fe6d34f402b786f17b4fde0

# Create non-root user (security practice)
RUN addgroup --system ollama && \
    adduser --system --ingroup ollama --home /home/ollama ollama

WORKDIR /home/ollama

# Assign Executable to ollama group
COPY --chown=ollama:ollama ./mistral7b.sh ./

# Make file executable
RUN chmod +x mistral7b.sh

# Switch User
USER ollama

# Basic Ollama Port
EXPOSE 11434

# Run the script on container startup
ENTRYPOINT ["./mistral7b.sh"]