from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
import pytest

from family_tree.adapters.identity.tokens import JwtTokenVerifier, principal_from_claims, signing_keys_at
from family_tree.domain.enums import Role
from family_tree.domain.errors import IdentityUnavailable, Unauthenticated
from tests.contract import ContractCase, assert_matches, case_ids
from tests.environment import JWKS_FILE, SIGNING_KEY, TEST_AUDIENCE, TEST_ISSUER
from tests.identity import access_token_claims, signed_token


def _base_input() -> dict[str, Any]:
    return {
        "sub": "3f1c",
        "sid": "session-9",
        "preferred_username": "guest",
        "name": "Demo Guest",
        "realm_access": {"roles": ["guest", "offline_access"]},
    }


def _base_expected() -> dict[str, Any]:
    return {
        "subject": "3f1c",
        "session_id": "session-9",
        "username": "guest",
        "display_name": "Demo Guest",
        "roles": frozenset({Role.GUEST}),
    }


CLAIM_CASES: list[ContractCase] = [
    {"id": "keycloak guest", "input_overrides": {}, "expected_overrides": {}},
    {
        "id": "member roles",
        "input_overrides": {"realm_access": {"roles": ["USER", "ADMIN"]}},
        "expected_overrides": {"roles": frozenset({Role.USER, Role.ADMIN})},
    },
    {
        "id": "no display name falls back to the username",
        "input_overrides": {"name": None},
        "expected_overrides": {"display_name": "guest"},
    },
    {
        "id": "no username falls back to the subject",
        "input_overrides": {"preferred_username": 7, "name": ""},
        "expected_overrides": {"username": "3f1c", "display_name": "3f1c"},
    },
    {"id": "no session", "input_overrides": {"sid": None}, "expected_overrides": {"session_id": None}},
    {
        "id": "malformed roles are ignored",
        "input_overrides": {"realm_access": {"roles": "USER"}},
        "expected_overrides": {"roles": frozenset()},
    },
    {
        "id": "no realm access",
        "input_overrides": {"realm_access": None},
        "expected_overrides": {"roles": frozenset()},
    },
]


@pytest.mark.parametrize("case", CLAIM_CASES, ids=case_ids(CLAIM_CASES))
def test_principal_from_claims(case: ContractCase) -> None:
    principal = principal_from_claims(_base_input() | case["input_overrides"])
    actual = {field: getattr(principal, field) for field in _base_expected()}
    assert_matches(actual, _base_expected() | case["expected_overrides"])


def test_a_token_without_subject_is_rejected() -> None:
    with pytest.raises(Unauthenticated):
        principal_from_claims(_base_input() | {"sub": ""})


def verifier(jwks_url: str = JWKS_FILE.as_uri()) -> JwtTokenVerifier:
    return JwtTokenVerifier(keys=signing_keys_at(jwks_url), issuer=TEST_ISSUER, audience=TEST_AUDIENCE)


def test_verifies_a_signed_token() -> None:
    principal = verifier().verify(signed_token(access_token_claims("member-7", ["USER"], "session-7")))
    assert (principal.subject, principal.session_id, principal.roles) == (
        "member-7",
        "session-7",
        frozenset({Role.USER}),
    )


@pytest.mark.parametrize(
    "claim_overrides",
    [
        {"aud": "another-app"},
        {"iss": "https://attacker.example/realms/luppol"},
        {"exp": datetime.now(UTC) - timedelta(minutes=5)},
        {"iat": None},
    ],
)
def test_rejects_tokens_for_someone_else(claim_overrides: dict[str, object]) -> None:
    claims = access_token_claims("member-7", ["USER"]) | claim_overrides
    with pytest.raises(Unauthenticated):
        verifier().verify(signed_token({name: value for name, value in claims.items() if value is not None}))


@pytest.mark.parametrize("token", ["", "not-a-token", "a.b.c"])
def test_rejects_garbage(token: str) -> None:
    with pytest.raises(Unauthenticated):
        verifier().verify(token)


def test_rejects_a_token_signed_with_another_key() -> None:
    token = signed_token(access_token_claims("member-7", ["USER"]))
    header, payload, signature = token.split(".")
    forged = ".".join([header, payload, signature[::-1]])
    with pytest.raises(Unauthenticated):
        verifier().verify(forged)


def test_reports_an_unreachable_identity_provider() -> None:
    token = signed_token(access_token_claims("member-7", ["USER"]))
    with pytest.raises(IdentityUnavailable):
        verifier("http://127.0.0.1:9/realms/luppol/protocol/openid-connect/certs").verify(token)


def test_reports_a_missing_key_file() -> None:
    token = signed_token(access_token_claims("member-7", ["USER"]))
    with pytest.raises(IdentityUnavailable):
        verifier((JWKS_FILE.parent / "missing.json").as_uri()).verify(token)


def test_rejects_an_unknown_key_id() -> None:
    token = jwt.encode(
        access_token_claims("member-7", ["USER"]), SIGNING_KEY, algorithm="RS256", headers={"kid": "x"}
    )
    with pytest.raises(Unauthenticated):
        verifier().verify(token)
