import os
import subprocess
import sys
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parent.parent
REQUIRED = [
    "APP_ENV",
    "APP_HOSTS",
    "DJANGO_SECRET_KEY",
    "POSTGRES_HOST",
    "POSTGRES_PORT",
    "POSTGRES_DB",
    "POSTGRES_USER",
    "POSTGRES_PASSWORD",
    "IDENTITY_ISSUER",
    "IDENTITY_AUDIENCE",
    "IDENTITY_JWKS_URL",
]


def load_settings(environment: dict[str, str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-c", "import config.settings"],
        cwd=BACKEND,
        env={"PATH": os.environ["PATH"], **environment},
        capture_output=True,
        text=True,
        check=False,
    )


def complete_environment() -> dict[str, str]:
    return {name: os.environ.get(name) or "configured" for name in REQUIRED} | {"APP_ENV": "production"}


def test_a_complete_environment_loads() -> None:
    assert load_settings(complete_environment()).returncode == 0


@pytest.mark.parametrize("missing", REQUIRED)
def test_a_missing_variable_stops_the_start_by_name(missing: str) -> None:
    environment = {name: value for name, value in complete_environment().items() if name != missing}
    loaded = load_settings(environment)
    assert (loaded.returncode, f"Set the environment variable {missing}." in loaded.stderr) == (1, True)


def test_an_unknown_environment_is_refused() -> None:
    loaded = load_settings(complete_environment() | {"APP_ENV": "staging"})
    assert (loaded.returncode, "APP_ENV must be one of" in loaded.stderr) == (1, True)
