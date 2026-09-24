from typing import Any

import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from tests.api.builders import add_partnership, add_person, error_code, link_parent

ANCESTRY = [
    ("grandfather", 1700),
    ("grandmother", 1702),
    ("father", 1730),
    ("mother", 1732),
    ("focus", 1760),
    ("partner", 1761),
    ("in_law", 1735),
]
LINEAGE = [("grandfather", "father"), ("grandmother", "father"), ("father", "focus"), ("mother", "focus")]


def build_family(client: APIClient, width: int) -> dict[str, int]:
    people = {name: add_person(client, name, born) for name, born in ANCESTRY}
    for parent_name, child_name in LINEAGE:
        link_parent(client, people[parent_name], people[child_name])
    link_parent(client, people["in_law"], people["partner"])
    add_partnership(client, people["focus"], people["partner"])
    add_partnership(client, people["father"], people["mother"])
    for index in range(width):
        add_descendants(client, people, index)
    return people


def add_descendants(client: APIClient, people: dict[str, int], index: int) -> None:
    child_id = add_person(client, f"child {index}", 1790 + index)
    link_parent(client, people["focus"], child_id)
    link_parent(client, people["partner"], child_id)
    link_parent(client, child_id, add_person(client, f"grandchild {index}", 1820 + index))


def chart(client: APIClient, person_id: int, ancestors: int = 4, descendants: int = 3) -> dict[str, Any]:
    response = client.get(
        f"/api/people/{person_id}/chart/", {"ancestors": ancestors, "descendants": descendants}
    )
    assert response.status_code == 200, response.content
    body: dict[str, Any] = response.json()
    return body


def given_names_in(body: dict[str, Any]) -> set[str]:
    return {person["given_names"] for person in body["people"]}


def test_the_chart_holds_ancestors_descendants_and_partners(member: APIClient) -> None:
    people = build_family(member, width=2)
    body = chart(member, people["focus"])
    expected = {"grandfather", "grandmother", "father", "mother", "focus", "partner"}
    expected |= {"child 0", "child 1", "grandchild 0", "grandchild 1"}
    assert (body["focus_id"], given_names_in(body)) == (people["focus"], expected)
    assert len(body["partnerships"]) == 2
    assert len(body["parent_links"]) == 4 + 2 * 3


def test_generation_limits_trim_the_chart(member: APIClient) -> None:
    people = build_family(member, width=1)
    body = chart(member, people["focus"], ancestors=1, descendants=1)
    assert given_names_in(body) == {"father", "mother", "focus", "partner", "child 0"}


def test_the_chart_takes_a_fixed_number_of_queries(member: APIClient) -> None:
    small, large = build_family(member, width=1), build_family(member, width=12)
    with CaptureQueriesContext(connection) as small_queries:
        chart(member, small["focus"])
    with CaptureQueriesContext(connection) as large_queries:
        chart(member, large["focus"])
    assert len(small_queries) == len(large_queries)


@pytest.mark.parametrize(
    "query", [{"ancestors": 9}, {"descendants": 7}, {"ancestors": -1}, {"ancestors": "many"}]
)
def test_rejects_out_of_range_generations(member: APIClient, query: dict[str, Any]) -> None:
    person_id = add_person(member, "Focus")
    assert member.get(f"/api/people/{person_id}/chart/", query).status_code == 400


def test_the_chart_of_a_missing_person_is_not_found(member: APIClient) -> None:
    response = member.get("/api/people/999999/chart/")
    assert (response.status_code, error_code(response)) == (404, "person.not_found")
