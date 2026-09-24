from io import StringIO

import pytest
from django.core.management import call_command
from rest_framework.test import APIClient

from tests.api.builders import add_person
from tests.conftest import ClientFactory

DEMO_PEOPLE = 65


def guest(client_for: ClientFactory, session_id: str) -> APIClient:
    return client_for("shared-guest", roles=("guest",), session_id=session_id)


def test_a_guest_gets_a_sandbox_with_the_demo_family(client_for: ClientFactory) -> None:
    visitor = guest(client_for, "visit-1")
    workspace = visitor.get("/api/workspace/").json()
    home = visitor.get(f"/api/people/{workspace['home_person_id']}/").json()
    assert (workspace["is_sandbox"], workspace["people_count"]) == (True, DEMO_PEOPLE)
    assert (home["given_names"], home["surname"], len(home["children"])) == ("Charles Robert", "Darwin", 10)
    assert visitor.get("/api/me/").json()["is_guest"] is True


def test_every_guest_session_has_its_own_sandbox(client_for: ClientFactory) -> None:
    first, second = guest(client_for, "visit-1"), guest(client_for, "visit-2")
    add_person(first, "Visitor's addition")
    counts = [client.get("/api/workspace/").json()["people_count"] for client in (first, second)]
    assert counts == [DEMO_PEOPLE + 1, DEMO_PEOPLE]


def test_old_sandboxes_make_room_for_new_guests(
    client_for: ClientFactory, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr("family_tree.domain.services.workspaces.MAX_GUEST_WORKSPACES", 2)
    for session in ("visit-1", "visit-2", "visit-3"):
        guest(client_for, session).get("/api/me/")
    output = StringIO()
    call_command("demo_reset", stdout=output)
    assert output.getvalue().strip() == "Removed 2 guest sandbox(es)."


def test_demo_reset_keeps_member_trees(client_for: ClientFactory, member: APIClient) -> None:
    add_person(member, "Kept")
    guest(client_for, "visit-1").get("/api/me/")
    call_command("demo_reset", stdout=StringIO())
    assert member.get("/api/workspace/").json()["people_count"] == 1


def test_a_guest_after_reset_gets_a_fresh_copy(client_for: ClientFactory) -> None:
    visitor = guest(client_for, "visit-1")
    add_person(visitor, "Scribble")
    call_command("demo_reset", stdout=StringIO())
    assert visitor.get("/api/workspace/").json()["people_count"] == DEMO_PEOPLE
