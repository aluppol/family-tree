from collections.abc import Callable

import pytest
from rest_framework.test import APIClient

from tests.identity import access_token

type ClientFactory = Callable[..., APIClient]


@pytest.fixture
def client_for(db: None) -> ClientFactory:
    def build(subject: str, roles: tuple[str, ...] = ("USER",), session_id: str | None = None) -> APIClient:
        client = APIClient()
        client.credentials(HTTP_X_FORWARDED_ACCESS_TOKEN=access_token(subject, roles, session_id))
        return client

    return build


@pytest.fixture
def member(client_for: ClientFactory) -> APIClient:
    return client_for("member-one")


@pytest.fixture
def other_member(client_for: ClientFactory) -> APIClient:
    return client_for("member-two")


@pytest.fixture
def anonymous(db: None) -> APIClient:
    return APIClient()
