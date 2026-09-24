import json
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path

import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from jwt.algorithms import RSAAlgorithm

from family_tree.domain.enums import Role

TOKEN_LIFETIME = timedelta(days=365)
KEY_SIZE_BITS = 2048
PUBLIC_EXPONENT = 65537


@dataclass(frozen=True, slots=True, kw_only=True)
class DevelopmentIdentity:
    issuer: str
    audience: str
    role: Role


def write_development_identity(directory: Path, identity: DevelopmentIdentity) -> None:
    private_key = rsa.generate_private_key(public_exponent=PUBLIC_EXPONENT, key_size=KEY_SIZE_BITS)
    key_id = secrets.token_hex(8)
    public_jwk = json.loads(RSAAlgorithm.to_jwk(private_key.public_key())) | {"kid": key_id, "use": "sig"}
    token = jwt.encode(_claims(identity), private_key, algorithm="RS256", headers={"kid": key_id})
    directory.mkdir(parents=True, exist_ok=True)
    (directory / "jwks.json").write_text(json.dumps({"keys": [public_jwk]}), encoding="utf-8")
    (directory / "token").write_text(token, encoding="utf-8")


def _claims(identity: DevelopmentIdentity) -> dict[str, object]:
    issued_at = datetime.now(UTC)
    name = f"local-{identity.role.value.lower()}"
    return {
        "iss": identity.issuer,
        "aud": identity.audience,
        "sub": name,
        "sid": f"{name}-session",
        "preferred_username": name,
        "name": f"Local {identity.role.value.lower()}",
        "realm_access": {"roles": [identity.role.value]},
        "iat": issued_at,
        "exp": issued_at + TOKEN_LIFETIME,
    }
