from operator import itemgetter
from typing import Any

from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from tests.api.builders import (
    add_partnership,
    add_person,
    create_person,
    error_code,
    exact,
    guest,
    link_parent,
    marriage_terms,
    profile_payload,
    put_photo,
    random_jpeg,
)
from tests.conftest import ClientFactory
from tests.identity import access_token_claims, signed_token

GRAPH = "/api/workspace/graph/"
PARTS = ("people", "parent_links", "partnerships")
DEMO_PEOPLE = 114
DEMO_PARENT_LINKS = 145
DEMO_MARRIAGES = 40
PHOTO_BYTES = 1024


def graph(client: APIClient) -> dict[str, Any]:
    response = client.get(GRAPH)
    assert response.status_code == 200, response.content
    body: dict[str, Any] = response.json()
    return body


def build_households(client: APIClient) -> dict[str, int]:
    ids: dict[str, int] = {
        "robert": create_person(client, profile_payload("Robert Waring", born=1766, died=1848))["id"],
        "susannah": create_person(client, profile_payload("Susannah", "Wedgwood", 1765, 1817))["id"],
        "charles": add_person(client, "Charles Robert", 1809),
        "loner": add_person(client, "Unattached"),
        "josiah": create_person(client, profile_payload("Josiah", "Wedgwood", 1730))["id"],
        "sarah": create_person(client, profile_payload("Sarah", "Wedgwood", 1734))["id"],
    }
    assert put_photo(client, ids["charles"], random_jpeg(PHOTO_BYTES)) == 204
    ids["adoption"] = link_parent(client, ids["susannah"], ids["charles"], kind="adopted")
    ids["birth"] = link_parent(client, ids["robert"], ids["charles"])
    ids["later_marriage"] = add_partnership(client, ids["robert"], ids["susannah"], start=1796)
    ids["earlier_marriage"] = add_partnership(client, ids["josiah"], ids["sarah"], start=1764)
    return ids


def expected_graph(ids: dict[str, int]) -> dict[str, Any]:
    return {
        "people": [
            summary(ids["robert"], "Robert Waring", "Darwin", 1766, 1848),
            summary(ids["susannah"], "Susannah", "Wedgwood", 1765, 1817),
            summary(ids["charles"], "Charles Robert", "Darwin", 1809, None) | {"has_photo": True},
            summary(ids["loner"], "Unattached", "Darwin", None, None),
            summary(ids["josiah"], "Josiah", "Wedgwood", 1730, None),
            summary(ids["sarah"], "Sarah", "Wedgwood", 1734, None),
        ],
        "parent_links": [
            parent_link(ids["adoption"], ids["susannah"], ids["charles"], "adopted"),
            parent_link(ids["birth"], ids["robert"], ids["charles"], "birth"),
        ],
        "partnerships": [
            marriage(ids["later_marriage"], ids["robert"], ids["susannah"], 1796),
            marriage(ids["earlier_marriage"], ids["josiah"], ids["sarah"], 1764),
        ],
    }


def summary(
    person_id: int, given_names: str, surname: str, born: int | None, died: int | None
) -> dict[str, Any]:
    return {
        "id": person_id,
        "given_names": given_names,
        "surname": surname,
        "sex": "unknown",
        "birth_date": None if born is None else exact(born),
        "death_date": None if died is None else exact(died),
        "is_deceased": died is not None,
        "has_photo": False,
    }


def parent_link(link_id: int, parent_id: int, child_id: int, kind: str) -> dict[str, Any]:
    return {"id": link_id, "parent_id": parent_id, "child_id": child_id, "kind": kind}


def marriage(partnership_id: int, first_id: int, second_id: int, start: int) -> dict[str, Any]:
    return {
        "id": partnership_id,
        "first_partner_id": first_id,
        "second_partner_id": second_id,
        "terms": marriage_terms(start),
    }


def add_couples(client: APIClient, couples: int) -> None:
    for number in range(couples):
        husband = add_person(client, f"husband {number}", 1800)
        wife = add_person(client, f"wife {number}", 1802)
        child = add_person(client, f"child {number}", 1830)
        add_partnership(client, husband, wife, start=1825)
        link_parent(client, wife, child)
        assert put_photo(client, child, random_jpeg(PHOTO_BYTES)) == 204


def test_the_graph_holds_every_person_and_relationship_of_the_tree(member: APIClient) -> None:
    households = build_households(member)
    assert graph(member) == expected_graph(households)


def test_an_empty_tree_is_an_empty_graph(member: APIClient) -> None:
    assert graph(member) == {"people": [], "parent_links": [], "partnerships": []}


def test_a_guest_sees_the_whole_demo_family(client_for: ClientFactory, member: APIClient) -> None:
    build_households(member)
    visitor = guest(client_for, "visit-1")
    pages = [visitor.get("/api/people/", {"limit": 100, "offset": offset}).json() for offset in (0, 100)]
    body, listed = graph(visitor), [person for page in pages for person in page["results"]]
    assert [len(body[part]) for part in PARTS] == [DEMO_PEOPLE, DEMO_PARENT_LINKS, DEMO_MARRIAGES]
    assert body["people"] == sorted(listed, key=itemgetter("id"))


def test_the_graph_never_shows_another_tree(member: APIClient, other_member: APIClient) -> None:
    mine, theirs = build_households(member), build_households(other_member)
    assert (graph(member), graph(other_member)) == (expected_graph(mine), expected_graph(theirs))


def test_the_graph_takes_a_fixed_number_of_queries(member: APIClient) -> None:
    add_couples(member, 1)
    with CaptureQueriesContext(connection) as small_queries:
        graph(member)
    add_couples(member, 12)
    with CaptureQueriesContext(connection) as large_queries:
        graph(member)
    assert len(small_queries) == len(large_queries)


def test_the_graph_requires_a_token(anonymous: APIClient) -> None:
    response = anonymous.get(GRAPH)
    assert (response.status_code, error_code(response)) == (401, "auth.unauthenticated")
    assert response.headers["WWW-Authenticate"] == 'Bearer realm="family-tree"'


def test_the_graph_refuses_a_forged_token(anonymous: APIClient) -> None:
    header, payload, signature = signed_token(access_token_claims("member-one", ["USER"])).split(".")
    anonymous.credentials(HTTP_X_FORWARDED_ACCESS_TOKEN=f"{header}.{payload}.{signature[::-1]}")
    response = anonymous.get(GRAPH)
    assert (response.status_code, error_code(response)) == (401, "auth.unauthenticated")


def test_the_graph_is_forbidden_without_a_role(client_for: ClientFactory) -> None:
    response = client_for("outsider", roles=()).get(GRAPH)
    assert (response.status_code, error_code(response)) == (403, "auth.forbidden")
