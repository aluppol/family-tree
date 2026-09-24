FROM node:24-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS frontend
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM python:3.13-slim@sha256:8d9d0b8bcf6506481eae4907c18f5e3e7902e629f5f6d684f9e7c32e85e3ddf0 AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    DJANGO_SETTINGS_MODULE=config.settings
RUN groupadd --system --gid 10001 app \
    && useradd --system --uid 10001 --gid app --home-dir /app --shell /usr/sbin/nologin app
WORKDIR /app
COPY backend/requirements.txt ./
RUN pip install --require-hashes --only-binary=:all: --requirement requirements.txt
COPY backend/manage.py ./
COPY backend/config ./config
COPY backend/family_tree ./family_tree
COPY --from=frontend /build/dist ./spa
RUN APP_ENV=production APP_HOSTS=build DJANGO_SECRET_KEY=collectstatic-only-not-a-secret \
    POSTGRES_HOST=build POSTGRES_PORT=5432 POSTGRES_DB=build POSTGRES_USER=build POSTGRES_PASSWORD=build \
    IDENTITY_ISSUER=build IDENTITY_AUDIENCE=build IDENTITY_JWKS_URL=https://build.invalid/jwks \
    python manage.py collectstatic --noinput --verbosity 0
COPY --chmod=0755 deploy/web/entrypoint.sh /usr/local/bin/web-entrypoint
COPY --chmod=0755 deploy/web/demo-reset.sh /usr/local/bin/demo-reset
USER app
EXPOSE 8080
ENTRYPOINT ["web-entrypoint"]
