FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app

COPY requirements.txt /app/

RUN apt-get update && \
    apt-get install -y netcat postgresql-client && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir -r requirements.txt

COPY . /app/

RUN chmod +x entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]
