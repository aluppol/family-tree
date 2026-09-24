from argparse import ArgumentParser
from pathlib import Path
from typing import Any

from django.conf import settings
from django.core.management.base import BaseCommand

from family_tree.dependencies import write_development_identity
from family_tree.domain.enums import Role


class Command(BaseCommand):
    help = "Write a signing key set and a long-lived access token for local development without Keycloak."

    def add_arguments(self, parser: ArgumentParser) -> None:
        parser.add_argument("directory", type=Path)
        parser.add_argument("--role", choices=[role.value for role in Role], default=Role.GUEST.value)

    def handle(self, *_args: Any, **options: Any) -> None:
        directory: Path = options["directory"]
        write_development_identity(
            directory,
            issuer=settings.IDENTITY_ISSUER,
            audience=settings.IDENTITY_AUDIENCE,
            role=Role(options["role"]),
        )
        self.stdout.write(f"Wrote {directory / 'jwks.json'} and {directory / 'token'}.")
