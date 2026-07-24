FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# This container talks to the Docker Engine API over /var/run/docker.sock, which must be
# mounted at runtime (see docker-compose.yml). It does NOT need the docker CLI installed.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
