#!/bin/sh
set -eu

docker compose --env-file "$IMAGES_ENV" exec -T web python - <<'PYTHON'
import json
import sys
import urllib.error
import urllib.request

ORIGIN = "http://127.0.0.1:8080"
GATEWAY_HEADERS = {"Host": "familytree.luppol.com", "X-Forwarded-Proto": "https"}


def fetch(path, headers=None):
    request = urllib.request.Request(ORIGIN + path, headers={**GATEWAY_HEADERS, **(headers or {})})
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            return response.status, response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.read()


def expect(label, actual, wanted):
    print(f"{'ok  ' if actual == wanted else 'FAIL'} {label}: {actual!r}")
    return actual == wanted


checks = [
    expect("health check", fetch("/healthz")[0], 200),
    expect("app shell on a client route", b'id="root"' in fetch("/people/1")[1], True),
    expect("api without a token", fetch("/api/me/")[0], 401),
    expect("api with a forged token", fetch("/api/me/", {"X-Forwarded-Access-Token": "a.b.c"})[0], 401),
    expect("error body", json.loads(fetch("/api/people/")[1])["error"]["code"], "auth.unauthenticated"),
    expect("gateway paths stay with the gateway", fetch("/oauth2/start")[0], 404),
]
sys.exit(0 if all(checks) else 1)
PYTHON

docker compose --env-file "$IMAGES_ENV" exec -T web demo-reset
