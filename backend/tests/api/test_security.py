from pathlib import Path

import pytest
from pytest_django.fixtures import Settings
from rest_framework.test import APIClient

from tests.api.builders import error_code, profile_payload
from tests.conftest import ClientFactory
from tests.identity import access_token_claims, signed_token


def test_the_api_requires_a_token(anonymous: APIClient) -> None:
    response = anonymous.get("/api/people/")
    assert (response.status_code, error_code(response)) == (401, "auth.unauthenticated")
    assert response.headers["WWW-Authenticate"] == 'Bearer realm="family-tree"'


def test_a_forged_token_is_rejected(anonymous: APIClient) -> None:
    header, payload, signature = signed_token(access_token_claims("member-one", ["USER"])).split(".")
    anonymous.credentials(HTTP_X_FORWARDED_ACCESS_TOKEN=f"{header}.{payload}.{signature[::-1]}")
    assert anonymous.get("/api/me/").status_code == 401


def test_a_signed_in_person_without_a_role_is_forbidden(client_for: ClientFactory) -> None:
    response = client_for("outsider", roles=()).get("/api/me/")
    assert (response.status_code, error_code(response)) == (403, "auth.forbidden")


def test_the_health_check_needs_no_token(anonymous: APIClient) -> None:
    response = anonymous.get("/healthz")
    assert (response.status_code, response.json()) == (200, {"status": "ok"})


@pytest.mark.parametrize(
    ("fetch_site", "status"), [("cross-site", 403), ("same-site", 403), ("same-origin", 201)]
)
def test_changes_must_come_from_the_app_itself(member: APIClient, fetch_site: str, status: int) -> None:
    response = member.post(
        "/api/people/", profile_payload("Emma", "Wedgwood"), format="json", HTTP_SEC_FETCH_SITE=fetch_site
    )
    assert response.status_code == status


def test_gateway_routes_are_never_served_by_the_app(anonymous: APIClient) -> None:
    assert anonymous.get("/oauth2/start").status_code == 404


def test_unknown_api_addresses_answer_in_json(member: APIClient) -> None:
    response = member.get("/api/nothing-here/")
    assert (response.status_code, error_code(response)) == (404, "route.not_found")


def test_responses_carry_security_headers(member: APIClient) -> None:
    headers = member.get("/api/me/").headers
    assert (headers["X-Frame-Options"], headers["X-Content-Type-Options"], headers["Referrer-Policy"]) == (
        "DENY",
        "nosniff",
        "same-origin",
    )


def test_client_routes_serve_the_single_page_app(
    anonymous: APIClient, settings: Settings, tmp_path: Path
) -> None:
    (tmp_path / "index.html").write_text("<!doctype html><title>Family Tree</title>", encoding="utf-8")
    settings.SPA_ROOT = tmp_path
    response = anonymous.get("/people/42/edit")
    assert (response.status_code, response.headers["Cache-Control"]) == (200, "no-cache")
    assert "script-src 'self'" in response.headers["Content-Security-Policy"]


def test_explains_a_missing_web_build(anonymous: APIClient, settings: Settings, tmp_path: Path) -> None:
    settings.SPA_ROOT = tmp_path
    response = anonymous.get("/")
    assert (response.status_code, b"npm run dev" in response.content) == (404, True)


@pytest.mark.parametrize(
    ("content_type", "declared_length", "status"),
    [
        ("application/json", 1024 * 1024 + 1, 413),
        ("image/jpeg", 3 * 1024 * 1024, 413),
        ("application/json", "not-a-number", 413),
    ],
)
def test_oversized_bodies_are_refused_unread(
    member: APIClient, content_type: str, declared_length: object, status: int
) -> None:
    response = member.post(
        "/api/people/", b"{}", content_type=content_type, CONTENT_LENGTH=str(declared_length)
    )
    assert (response.status_code, error_code(response)) == (status, "request.too_large")
