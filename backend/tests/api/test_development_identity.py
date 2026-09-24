from io import StringIO
from pathlib import Path

import pytest
from django.core.management import call_command

from family_tree.adapters.identity.tokens import JwtTokenVerifier, signing_keys_at
from family_tree.domain.enums import Role
from tests.environment import TEST_AUDIENCE, TEST_ISSUER


@pytest.mark.parametrize("role", [Role.GUEST, Role.USER])
def test_writes_a_key_set_and_a_token_that_verifies(tmp_path: Path, role: Role) -> None:
    output = StringIO()
    call_command("issue_development_identity", str(tmp_path), "--role", role.value, stdout=output)
    verifier = JwtTokenVerifier(
        keys=signing_keys_at((tmp_path / "jwks.json").as_uri()), issuer=TEST_ISSUER, audience=TEST_AUDIENCE
    )
    principal = verifier.verify((tmp_path / "token").read_text(encoding="utf-8"))
    assert (principal.roles, principal.session_id) == (
        frozenset({role}),
        f"local-{role.value.lower()}-session",
    )
    assert output.getvalue().startswith("Wrote ")
