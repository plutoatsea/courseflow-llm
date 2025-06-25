# Node.js 14 for frontend build
FROM node:14-bullseye as node-builder

WORKDIR /app

# Install frontend dependencies
COPY package.json yarn.lock ./
RUN yarn install

# Copy frontend files and build
COPY ./course_flow/static/course_flow ./course_flow/static/course_flow
COPY gulpfile.js ./
COPY rollup.config.js ./
RUN yarn run gulp build-js


# Python 3.8 for backend
FROM python:3.8-bullseye as python-builder

WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy everything for pip install
COPY . .
RUN pip install --user --no-cache-dir -r requirements/requirements.txt

# Copy local settings file into Django project
COPY ./local_settings.py ./course_flow/local_settings.py

# Execute Script that handles admin creation and database seeding migrations
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh && exec ./entrypoint.sh


# Final runtime image
FROM python:3.8-slim-bullseye

WORKDIR /app

# Copy frontend output from node-builder
COPY --from=node-builder /app/course_flow/static/course_flow/js ./course_flow/static/course_flow/js

# Copy installed Python packages and app code
COPY --from=python-builder /root/.local /root/.local
COPY --from=python-builder /app .
COPY --from=python-builder /app/db.sqlite3 ./db.sqlite3

# Ensure Python binaries are found
ENV PATH=/root/.local/bin:$PATH

# Expose Django port
EXPOSE 8000
ENV PYTHONUNBUFFERED=1

# Run dev server
CMD ["python", "course_flow.py", "runserver", "0.0.0.0:8000"]