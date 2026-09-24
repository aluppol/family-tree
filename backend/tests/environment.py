import json
import os
import secrets
import tempfile
from pathlib import Path

from cryptography.hazmat.primitives.asymmetric import rsa
from jwt.algorithms import RSAAlgorithm

TEST_ISSUER = "https://identity.test/realms/family-tree"
TEST_AUDIENCE = "familytree"
SIGNING_KEY_ID = "test-signing-key"
SIGNING_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
IDENTITY_DIRECTORY = Path(tempfile.mkdtemp(prefix="family-tree-test-identity-"))
JWKS_FILE = IDENTITY_DIRECTORY / "jwks.json"


def _write_signing_key_set() -> None:
    public_jwk = json.loads(RSAAlgorithm.to_jwk(SIGNING_KEY.public_key())) | {
        "kid": SIGNING_KEY_ID,
        "use": "sig",
    }
    JWKS_FILE.write_text(json.dumps({"keys": [public_jwk]}), encoding="utf-8")


_write_signing_key_set()
os.environ |= {
    "APP_ENV": "development",
    "APP_HOSTS": "testserver,localhost",
    "DJANGO_SECRET_KEY": secrets.token_hex(32),
    "IDENTITY_ISSUER": TEST_ISSUER,
    "IDENTITY_AUDIENCE": TEST_AUDIENCE,
    "IDENTITY_JWKS_URL": JWKS_FILE.as_uri(),
}
