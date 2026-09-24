#!/bin/sh
set -eu

python /app/manage.py migrate --noinput
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:8080 \
    --workers 2 \
    --threads 4 \
    --worker-tmp-dir /dev/shm \
    --timeout 120 \
    --graceful-timeout 20 \
    --max-requests 2000 \
    --max-requests-jitter 200 \
    --access-logfile - \
    --forwarded-allow-ips '*'
