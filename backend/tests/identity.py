from collections.abc import Sequence
from datetime import UTC, datetime, timedelta

import jwt

from tests.environment import SIGNING_KEY, SIGNING_KEY_ID, TEST_AUDIENCE, TEST_ISSUER

TOKEN_LIFETIME = timedelta(minutes=5)


def access_token_claims(
    subject: str, roles: Sequence[str], session_id: str | None = None
) -> dict[str, object]:
    issued_at = datetime.now(UTC)
    return {
        "iss": TEST_ISSUER,
        "aud": TEST_AUDIENCE,
        "sub": subject,
        "sid": session_id,
        "preferred_username": f"{subject}.login",
        "name": f"{subject.title()} Tester",
        "realm_access": {"roles": list(roles)},
        "iat": issued_at,
        "exp": issued_at + TOKEN_LIFETIME,
    }


def signed_token(claims: dict[str, object]) -> str:
    return jwt.encode(claims, SIGNING_KEY, algorithm="RS256", headers={"kid": SIGNING_KEY_ID})


def access_token(subject: str, roles: Sequence[str], session_id: str | None = None) -> str:
    return signed_token(access_token_claims(subject, roles, session_id))
