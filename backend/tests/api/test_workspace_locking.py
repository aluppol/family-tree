from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor, wait
from dataclasses import dataclass
from typing import Any

import pytest
from django.db import DatabaseError, connections, transaction
from rest_framework.test import APIClient

from family_tree.adapters.persistence.people import DjangoPersonRepository
from family_tree.dependencies import container
from family_tree.domain.identifiers import PersonId
from family_tree.domain.workspaces import FamilyTree
from tests.api.builders import (
    add_person,
    error_code,
    marriage_terms,
    open_sandbox,
    profile_payload,
    put_photo,
    random_jpeg,
    upload,
    visitors_gedcom,
)
from tests.concurrency import STILL_WAITING_SECONDS, WAIT_SECONDS, held_open, run_and_close
from tests.conftest import ClientFactory

DATABASE = "default"
SMALL_PHOTO_BYTES = 1_000
SUCCESS_STATUSES = frozenset({200, 201, 204})
ROW_LOCK_PROBES = (
    "SELECT 1 FROM person WHERE tree_id = %s FOR UPDATE NOWAIT",
    "SELECT 1 FROM parent_link WHERE tree_id = %s FOR UPDATE NOWAIT",
    "SELECT 1 FROM partnership WHERE tree_id = %s FOR UPDATE NOWAIT",
    "SELECT 1 FROM person_photo WHERE tree_id = %s FOR UPDATE NOWAIT",
)


@dataclass(frozen=True, slots=True, kw_only=True)
class Sandbox:
    visitor: APIClient
    tree: FamilyTree
    first: int
    second: int
    link_id: int
    partnership_id: int


EVERY_CHANGE: dict[str, Callable[[Sandbox], Any]] = {
    "add a person": lambda sandbox: sandbox.visitor.post(
        "/api/people/", profile_payload("Someone"), format="json"
    ),
    "change a person": lambda sandbox: sandbox.visitor.put(
        f"/api/people/{sandbox.first}/", profile_payload("Renamed"), format="json"
    ),
    "delete a person": lambda sandbox: sandbox.visitor.delete(f"/api/people/{sandbox.second}/"),
    "link a parent": lambda sandbox: sandbox.visitor.post(
        "/api/parent-links/",
        {"parent_id": sandbox.first, "child_id": sandbox.second, "kind": "birth"},
        format="json",
    ),
    "change a link kind": lambda sandbox: sandbox.visitor.put(
        f"/api/parent-links/{sandbox.link_id}/", {"kind": "adopted"}, format="json"
    ),
    "unlink a parent": lambda sandbox: sandbox.visitor.delete(f"/api/parent-links/{sandbox.link_id}/"),
    "add a partnership": lambda sandbox: sandbox.visitor.post(
        "/api/partnerships/",
        {"first_partner_id": sandbox.first, "second_partner_id": sandbox.second, "terms": marriage_terms()},
        format="json",
    ),
    "change partnership terms": lambda sandbox: sandbox.visitor.put(
        f"/api/partnerships/{sandbox.partnership_id}/", {"terms": marriage_terms(1840)}, format="json"
    ),
    "remove a partnership": lambda sandbox: sandbox.visitor.delete(
        f"/api/partnerships/{sandbox.partnership_id}/"
    ),
    "replace a photo": lambda sandbox: sandbox.visitor.put(
        f"/api/people/{sandbox.first}/photo/", random_jpeg(SMALL_PHOTO_BYTES), content_type="image/jpeg"
    ),
    "remove a photo": lambda sandbox: sandbox.visitor.delete(f"/api/people/{sandbox.first}/photo/"),
    "import a file": lambda sandbox: upload(sandbox.visitor, "/api/gedcom/import/", visitors_gedcom(1)),
    "choose the home person": lambda sandbox: sandbox.visitor.put(
        "/api/workspace/home-person/", {"person_id": sandbox.first}, format="json"
    ),
}


@pytest.mark.django_db(transaction=True)
@pytest.mark.parametrize("change", EVERY_CHANGE)
def test_every_change_waits_for_a_change_already_in_progress(client_for: ClientFactory, change: str) -> None:
    sandbox = prepared_sandbox(client_for)
    with ThreadPoolExecutor(max_workers=1) as requests:
        with held_open(lambda: container().workspaces.lock(sandbox.tree)):
            pending = requests.submit(run_and_close, lambda: EVERY_CHANGE[change](sandbox))
            assert not wait([pending], timeout=STILL_WAITING_SECONDS).done
            assert rows_of_tree_are_free(sandbox.tree) is True
        assert pending.result(timeout=WAIT_SECONDS).status_code in SUCCESS_STATUSES


@pytest.mark.django_db(transaction=True)
def test_choosing_a_home_person_deleted_meanwhile_answers_not_found(client_for: ClientFactory) -> None:
    sandbox = prepared_sandbox(client_for)
    choice = {"person_id": sandbox.second}
    with ThreadPoolExecutor(max_workers=1) as requests:
        with held_open(lambda: delete_while_locked(sandbox.tree, sandbox.second)):
            pending = requests.submit(
                run_and_close,
                lambda: sandbox.visitor.put("/api/workspace/home-person/", choice, format="json"),
            )
            assert not wait([pending], timeout=STILL_WAITING_SECONDS).done
        response = pending.result(timeout=WAIT_SECONDS)
    assert (response.status_code, error_code(response)) == (404, "person.not_found")


def prepared_sandbox(client_for: ClientFactory) -> Sandbox:
    visitor, tree = open_sandbox(client_for, "busy")
    first, second = add_person(visitor, "First"), add_person(visitor, "Second")
    assert put_photo(visitor, first, random_jpeg(SMALL_PHOTO_BYTES)) == 204
    home = visitor.get(f"/api/people/{tree.home_person_id}/").json()
    return Sandbox(
        visitor=visitor,
        tree=tree,
        first=first,
        second=second,
        link_id=home["parents"][0]["link_id"],
        partnership_id=home["partnerships"][0]["partnership_id"],
    )


def rows_of_tree_are_free(tree: FamilyTree) -> bool:
    try:
        with transaction.atomic(using=DATABASE), connections[DATABASE].cursor() as cursor:
            for probe in ROW_LOCK_PROBES:
                cursor.execute(probe, [tree.id])
    except DatabaseError:
        return False
    return True


def delete_while_locked(tree: FamilyTree, person_id: int) -> None:
    container().workspaces.lock(tree)
    DjangoPersonRepository(DATABASE).delete(tree.id, PersonId(person_id))
