from collections.abc import Mapping
from pathlib import Path
from typing import Protocol
from urllib.parse import urlparse
from urllib.request import url2pathname

import jwt

from family_tree.domain.enums import Role
from family_tree.domain.errors import IdentityUnavailable, Unauthenticated
from family_tree.domain.workspaces import Principal

ALLOWED_ALGORITHMS = ["RS256", "PS256", "ES256"]
REQUIRED_CLAIMS = ["exp", "iat", "iss", "aud", "sub"]
LEEWAY_SECONDS = 30
KEY_CACHE_SECONDS = 300
FETCH_TIMEOUT_SECONDS = 5
KNOWN_ROLES = frozenset(role.value for role in Role)
SESSION_ENDED = "Your session has ended; sign in again."
PROVIDER_UNREACHABLE = "The sign-in service cannot be reached."


class SigningKeySource(Protocol):
    def key_for(self, token: str) -> jwt.PyJWK: ...


class RemoteSigningKeys:
    def __init__(self, url: str) -> None:
        self._client = jwt.PyJWKClient(
            url, cache_keys=True, lifespan=KEY_CACHE_SECONDS, timeout=FETCH_TIMEOUT_SECONDS
        )

    def key_for(self, token: str) -> jwt.PyJWK:
        try:
            return self._client.get_signing_key_from_jwt(token)
        except jwt.PyJWKClientConnectionError as error:
            raise IdentityUnavailable("identity.unavailable", PROVIDER_UNREACHABLE) from error
        except (jwt.PyJWKClientError, jwt.InvalidTokenError) as error:
            raise Unauthenticated("auth.unauthenticated", SESSION_ENDED) from error


class FileSigningKeys:
    def __init__(self, path: Path) -> None:
        self._path = path

    def key_for(self, token: str) -> jwt.PyJWK:
        try:
            key_id = jwt.get_unverified_header(token).get("kid")
            key_set = jwt.PyJWKSet.from_json(self._path.read_text(encoding="utf-8"))
        except OSError as error:
            raise IdentityUnavailable("identity.unavailable", PROVIDER_UNREACHABLE) from error
        except (jwt.InvalidTokenError, jwt.PyJWKSetError) as error:
            raise Unauthenticated("auth.unauthenticated", SESSION_ENDED) from error
        signing_key = next((key for key in key_set.keys if key.key_id == key_id), None)
        if signing_key is None:
            raise Unauthenticated("auth.unauthenticated", SESSION_ENDED)
        return signing_key


class JwtTokenVerifier:
    def __init__(self, *, keys: SigningKeySource, issuer: str, audience: str) -> None:
        self._keys = keys
        self._issuer = issuer
        self._audience = audience

    def verify(self, token: str) -> Principal:
        signing_key = self._keys.key_for(token)
        try:
            claims = jwt.decode(
                token,
                signing_key,
                algorithms=ALLOWED_ALGORITHMS,
                audience=self._audience,
                issuer=self._issuer,
                leeway=LEEWAY_SECONDS,
                options={"require": REQUIRED_CLAIMS},
            )
        except jwt.InvalidTokenError as error:
            raise Unauthenticated("auth.unauthenticated", SESSION_ENDED) from error
        return principal_from_claims(claims)


def signing_keys_at(url: str) -> SigningKeySource:
    location = urlparse(url)
    if location.scheme == "file":
        return FileSigningKeys(Path(url2pathname(location.path)))
    return RemoteSigningKeys(url)


def principal_from_claims(claims: Mapping[str, object]) -> Principal:
    subject = _text_claim(claims, "sub")
    if not subject:
        raise Unauthenticated("auth.unauthenticated", SESSION_ENDED)
    username = _text_claim(claims, "preferred_username") or subject
    return Principal(
        subject=subject,
        session_id=_text_claim(claims, "sid") or None,
        username=username,
        display_name=_text_claim(claims, "name") or username,
        roles=_realm_roles(claims),
    )


def _text_claim(claims: Mapping[str, object], name: str) -> str:
    claim = claims.get(name)
    return claim if isinstance(claim, str) else ""


def _realm_roles(claims: Mapping[str, object]) -> frozenset[Role]:
    realm_access = claims.get("realm_access")
    roles = realm_access.get("roles") if isinstance(realm_access, Mapping) else None
    if not isinstance(roles, list):
        return frozenset()
    return frozenset(Role(role) for role in roles if isinstance(role, str) and role in KNOWN_ROLES)
