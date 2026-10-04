import secrets
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor, wait
from dataclasses import dataclass
from typing import Any

import pytest
from rest_framework.test import APIClient

from family_tree.adapters.persistence.meter import PostgresWorkspaceMeter
from family_tree.adapters.persistence.photos import DjangoPhotoStore
from family_tree.dependencies import container
from family_tree.domain.allowances import GUEST_ALLOWANCE
from family_tree.domain.enums import UsageMeasure
from family_tree.domain.errors import RuleViolation
from family_tree.domain.identifiers import PersonId
from family_tree.domain.photos import photo_from_bytes
from family_tree.domain.workspaces import FamilyTree
from tests.api.builders import (
    add_person,
    error_code,
    error_message,
    gedcom_of,
    marriage_terms,
    open_sandbox,
    people_count,
    profile_payload,
    put_photo,
    random_jpeg,
    upload,
    visitors_gedcom,
)
from tests.concurrency import STILL_WAITING_SECONDS, WAIT_SECONDS, held_open, run_and_commit
from tests.conftest import ClientFactory

DATABASE = "default"
PEOPLE_CEILING = GUEST_ALLOWANCE.ceilings[UsageMeasure.PEOPLE]
RELATIONSHIP_CEILING = GUEST_ALLOWANCE.ceilings[UsageMeasure.RELATIONSHIPS]
STORED_BYTES_CEILING = GUEST_ALLOWANCE.ceilings[UsageMeasure.STORED_BYTES]
LARGE_PHOTO_BYTES = 1_600_000
FILLER_LINE_LENGTH = 200
STORYTELLERS = 120
STORY_RANDOM_BYTES = 6_700


@dataclass(frozen=True, slots=True, kw_only=True)
class OverfullSandbox:
    visitor: APIClient
    first: int
    second: int
    home: dict[str, Any]


GROWING_CHANGES: dict[str, Callable[[OverfullSandbox], Any]] = {
    "add someone": lambda sandbox: sandbox.visitor.post(
        "/api/people/", profile_payload("Someone"), format="json"
    ),
    "lengthen a biography": lambda sandbox: sandbox.visitor.put(
        f"/api/people/{sandbox.first}/",
        profile_payload("First") | {"biography": "A longer life story."},
        format="json",
    ),
    "link a parent": lambda sandbox: sandbox.visitor.post(
        "/api/parent-links/",
        {"parent_id": sandbox.first, "child_id": sandbox.second, "kind": "birth"},
        format="json",
    ),
    "change a link kind": lambda sandbox: sandbox.visitor.put(
        f"/api/parent-links/{sandbox.home['parents'][0]['link_id']}/", {"kind": "adopted"}, format="json"
    ),
    "add a partnership": lambda sandbox: sandbox.visitor.post(
        "/api/partnerships/",
        {"first_partner_id": sandbox.first, "second_partner_id": sandbox.second, "terms": marriage_terms()},
        format="json",
    ),
    "change partnership terms": lambda sandbox: sandbox.visitor.put(
        f"/api/partnerships/{sandbox.home['partnerships'][0]['partnership_id']}/",
        {"terms": marriage_terms() | {"start": {"date": None, "place": "Maer Hall, Staffordshire"}}},
        format="json",
    ),
    "replace a photo": lambda sandbox: sandbox.visitor.put(
        f"/api/people/{sandbox.first}/photo/", random_jpeg(LARGE_PHOTO_BYTES), content_type="image/jpeg"
    ),
    "import a file": lambda sandbox: upload(sandbox.visitor, "/api/gedcom/import/", visitors_gedcom(1)),
}


def test_a_guest_fills_the_sandbox_up_to_its_people_limit(client_for: ClientFactory) -> None:
    visitor, _ = open_sandbox(client_for, "people-1")
    room = PEOPLE_CEILING - people_count(visitor)
    assert upload(visitor, "/api/gedcom/import/", visitors_gedcom(room)).status_code == 201
    refused = visitor.post("/api/people/", profile_payload("One more"), format="json")
    assert (refused.status_code, error_code(refused), error_message(refused)) == (
        400,
        "workspace.limit_reached",
        "The demo sandbox holds at most 300 people.",
    )
    assert people_count(visitor) == PEOPLE_CEILING


def test_a_file_with_more_people_than_the_sandbox_has_room_for_adds_nobody(client_for: ClientFactory) -> None:
    visitor, _ = open_sandbox(client_for, "people-2")
    before = people_count(visitor)
    response = upload(visitor, "/api/gedcom/import/", visitors_gedcom(PEOPLE_CEILING - before + 1))
    assert (response.status_code, error_message(response), people_count(visitor)) == (
        400,
        "The demo sandbox holds at most 300 people.",
        before,
    )


def test_an_import_whose_stories_would_overfill_the_sandbox_adds_nobody(client_for: ClientFactory) -> None:
    visitor, _ = open_sandbox(client_for, "stories-1")
    assert put_photo(visitor, add_person(visitor, "Portrait"), random_jpeg(LARGE_PHOTO_BYTES)) == 204
    before = people_count(visitor)
    response = upload(visitor, "/api/gedcom/import/", storytellers_gedcom(STORYTELLERS))
    assert (response.status_code, error_message(response), people_count(visitor)) == (
        400,
        "The demo sandbox holds at most 2.5 MB of family data and photos.",
        before,
    )


def test_a_guest_links_people_up_to_the_relationship_limit(client_for: ClientFactory) -> None:
    visitor, tree = open_sandbox(client_for, "links-1")
    room = RELATIONSHIP_CEILING - measured(tree, UsageMeasure.RELATIONSHIPS)
    assert upload(visitor, "/api/gedcom/import/", remarried_couple_gedcom(room)).status_code == 201
    ann, bob = [
        person["id"] for person in visitor.get("/api/people/", {"search": "Caller"}).json()["results"]
    ]
    partners = {"first_partner_id": ann, "second_partner_id": bob, "terms": marriage_terms()}
    refused = visitor.post("/api/partnerships/", partners, format="json")
    assert (refused.status_code, error_message(refused)) == (
        400,
        "The demo sandbox holds at most 1,500 parent links and partnerships.",
    )
    assert measured(tree, UsageMeasure.RELATIONSHIPS) == RELATIONSHIP_CEILING


def test_a_photo_that_would_overfill_the_sandbox_is_refused(client_for: ClientFactory) -> None:
    visitor, _ = open_sandbox(client_for, "photos-1")
    first, second = add_person(visitor, "First"), add_person(visitor, "Second")
    assert put_photo(visitor, first, random_jpeg(LARGE_PHOTO_BYTES)) == 204
    refused = visitor.put(
        f"/api/people/{second}/photo/", random_jpeg(LARGE_PHOTO_BYTES), content_type="image/jpeg"
    )
    assert (refused.status_code, error_code(refused), error_message(refused)) == (
        400,
        "workspace.limit_reached",
        "The demo sandbox holds at most 2.5 MB of family data and photos.",
    )
    assert visitor.get(f"/api/people/{second}/").json()["has_photo"] is False


def test_a_guest_replaces_a_photo_or_removes_one_to_make_room(client_for: ClientFactory) -> None:
    visitor, _ = open_sandbox(client_for, "photos-2")
    first, second = add_person(visitor, "First"), add_person(visitor, "Second")
    assert put_photo(visitor, first, random_jpeg(LARGE_PHOTO_BYTES)) == 204
    assert put_photo(visitor, first, random_jpeg(LARGE_PHOTO_BYTES)) == 204
    assert visitor.delete(f"/api/people/{first}/photo/").status_code == 204
    assert put_photo(visitor, second, random_jpeg(LARGE_PHOTO_BYTES)) == 204


@pytest.mark.parametrize("change", GROWING_CHANGES)
def test_a_sandbox_past_its_allowance_refuses_every_change_that_keeps_it_there(
    client_for: ClientFactory, change: str
) -> None:
    response = GROWING_CHANGES[change](overfull_sandbox(client_for, f"overfull-{change}"))
    assert (response.status_code, error_code(response)) == (400, "workspace.limit_reached")


def test_removing_a_photo_brings_a_sandbox_back_within_its_allowance(client_for: ClientFactory) -> None:
    sandbox = overfull_sandbox(client_for, "overfull-removal")
    assert sandbox.visitor.delete(f"/api/people/{sandbox.second}/photo/").status_code == 204
    assert GROWING_CHANGES["add someone"](sandbox).status_code == 201


@pytest.mark.parametrize("path", ["/api/gedcom/preview/", "/api/gedcom/import/"])
def test_a_guest_file_past_the_upload_limit_is_refused_before_it_is_parsed(
    client_for: ClientFactory, path: str
) -> None:
    visitor, _ = open_sandbox(client_for, "upload-1")
    before = people_count(visitor)
    response = upload(visitor, path, b"not a family tree " * (GUEST_ALLOWANCE.largest_upload_bytes // 18 + 1))
    assert (response.status_code, error_code(response), error_message(response)) == (
        400,
        "gedcom.too_large",
        "The file is larger than 2 MB.",
    )
    assert people_count(visitor) == before


def test_members_store_photos_and_files_past_the_guest_limits(member: APIClient) -> None:
    first, second = add_person(member, "First"), add_person(member, "Second")
    photos = [put_photo(member, person_id, random_jpeg(LARGE_PHOTO_BYTES)) for person_id in (first, second)]
    preview = upload(member, "/api/gedcom/preview/", padded_gedcom(GUEST_ALLOWANCE.largest_upload_bytes + 1))
    assert (photos, preview.status_code, preview.json()["people_count"]) == ([204, 204], 200, 1)


@pytest.mark.django_db(transaction=True)
def test_two_writers_racing_for_the_last_room_cannot_both_commit(client_for: ClientFactory) -> None:
    visitor, tree = open_sandbox(client_for, "race")
    first, second = add_person(visitor, "First"), add_person(visitor, "Second")
    with ThreadPoolExecutor(max_workers=1) as rivals:
        with held_open(lambda: store_photo_checking_room(tree, first)):
            rival = rivals.submit(run_and_commit, lambda: store_photo_checking_room(tree, second))
            assert not wait([rival], timeout=STILL_WAITING_SECONDS).done
        with pytest.raises(RuleViolation):
            rival.result(timeout=WAIT_SECONDS)
    assert measured(tree, UsageMeasure.STORED_BYTES) <= STORED_BYTES_CEILING


def measured(tree: FamilyTree, measure: UsageMeasure) -> int:
    return PostgresWorkspaceMeter(DATABASE).usage(tree.id, measure)


def store_photo_checking_room(tree: FamilyTree, person_id: int) -> None:
    container().workspaces.lock(tree)
    photo = photo_from_bytes(random_jpeg(LARGE_PHOTO_BYTES))
    DjangoPhotoStore(DATABASE).save(tree.id, PersonId(person_id), photo)
    container().workspaces.ensure_within_allowance(tree)


def overfull_sandbox(client_for: ClientFactory, session_id: str) -> OverfullSandbox:
    visitor, tree = open_sandbox(client_for, session_id)
    first, second = add_person(visitor, "First"), add_person(visitor, "Second")
    for person_id in (first, second):
        photo = photo_from_bytes(random_jpeg(LARGE_PHOTO_BYTES))
        DjangoPhotoStore(DATABASE).save(tree.id, PersonId(person_id), photo)
    home = visitor.get(f"/api/people/{tree.home_person_id}/").json()
    return OverfullSandbox(visitor=visitor, first=first, second=second, home=home)


def remarried_couple_gedcom(partnerships: int) -> bytes:
    couple = ["0 @I1@ INDI", "1 NAME Ann /Caller/", "0 @I2@ INDI", "1 NAME Bob /Caller/"]
    families = [
        line
        for number in range(1, partnerships + 1)
        for line in (f"0 @F{number}@ FAM", "1 HUSB @I1@", "1 WIFE @I2@")
    ]
    return gedcom_of([*couple, *families])


def storytellers_gedcom(people: int) -> bytes:
    return gedcom_of([line for number in range(1, people + 1) for line in storyteller(number)])


def storyteller(number: int) -> list[str]:
    story = secrets.token_urlsafe(STORY_RANDOM_BYTES)
    first, *rest = [
        story[start : start + FILLER_LINE_LENGTH] for start in range(0, len(story), FILLER_LINE_LENGTH)
    ]
    return [
        f"0 @I{number}@ INDI",
        f"1 NAME Storyteller {number} /Caller/",
        f"1 NOTE {first}",
        *(f"2 CONC {chunk}" for chunk in rest),
    ]


def padded_gedcom(size: int) -> bytes:
    filler = [f"1 CONC {'x' * FILLER_LINE_LENGTH}" for _ in range(size // FILLER_LINE_LENGTH)]
    return gedcom_of(["0 @I1@ INDI", "1 NAME Ann /Caller/", "0 @N1@ NOTE Padding", *filler])
