from typing import Any

import pytest
from rest_framework.test import APIClient

from tests.api.builders import calendar, create_person, error_code, exact, profile_payload

DARWIN: dict[str, Any] = {
    "given_names": "Charles Robert",
    "surname": "Darwin",
    "sex": "male",
    "birth": {"date": exact(1809, 2, 12), "place": "The Mount, Shrewsbury"},
    "death": {"date": exact(1882, 4, 19), "place": "Down House, Downe"},
    "biography": "Naturalist.\n\nAuthor of On the Origin of Species.",
}


def test_creates_and_reads_a_person(member: APIClient) -> None:
    created = create_person(member, DARWIN)
    expected = DARWIN | {
        "id": created["id"],
        "has_photo": False,
        "parents": [],
        "children": [],
        "partnerships": [],
    }
    assert created == expected
    assert member.get(f"/api/people/{created['id']}/").json() == expected


@pytest.mark.parametrize(
    "genealogical_date",
    [
        exact(1809),
        exact(1809, 2),
        {"qualifier": "about", "value": calendar(1765), "until": None},
        {"qualifier": "calculated", "value": calendar(1765), "until": None},
        {"qualifier": "estimated", "value": calendar(1765), "until": None},
        {"qualifier": "before", "value": calendar(1790, 3), "until": None},
        {"qualifier": "after", "value": calendar(1790), "until": None},
        {"qualifier": "between", "value": calendar(1760), "until": calendar(1762, 5, 2)},
    ],
)
def test_keeps_genealogical_dates_exactly(member: APIClient, genealogical_date: dict[str, Any]) -> None:
    payload = DARWIN | {"birth": {"date": genealogical_date, "place": ""}, "death": None}
    assert create_person(member, payload)["birth"]["date"] == genealogical_date


def test_a_calendar_date_stays_the_same_day(member: APIClient) -> None:
    payload = DARWIN | {"birth": {"date": exact(1990, 5, 5), "place": ""}, "death": None}
    person_id = create_person(member, payload)["id"]
    assert member.get(f"/api/people/{person_id}/").json()["birth"]["date"] == exact(1990, 5, 5)


def test_searches_and_pages_alphabetically(member: APIClient) -> None:
    for given_names, surname in [("Emma", "Wedgwood"), ("Charles", "Darwin"), ("Erasmus", "Darwin")]:
        create_person(member, profile_payload(given_names, surname))
    first_page = member.get("/api/people/", {"search": "darwin", "limit": "1"}).json()
    second_page = member.get("/api/people/", {"search": "darwin", "limit": "1", "offset": "1"}).json()
    assert (first_page["count"], first_page["next_offset"], second_page["next_offset"]) == (2, 1, None)
    names = [page["results"][0]["given_names"] for page in (first_page, second_page)]
    assert names == ["Charles", "Erasmus"]


def test_search_matches_every_word(member: APIClient) -> None:
    create_person(member, profile_payload("Charles Robert", "Darwin"))
    create_person(member, profile_payload("Charles", "Langton"))
    results = member.get("/api/people/", {"search": "charles dar"}).json()["results"]
    assert [person["surname"] for person in results] == ["Darwin"]


def test_updates_a_person(member: APIClient) -> None:
    person_id = create_person(member, DARWIN)["id"]
    changed = DARWIN | {"given_names": "Charles", "death": None, "biography": ""}
    response = member.put(f"/api/people/{person_id}/", changed, format="json")
    assert (response.status_code, response.json()["given_names"], response.json()["death"]) == (
        200,
        "Charles",
        None,
    )


def test_deletes_a_person(member: APIClient) -> None:
    person_id = create_person(member, DARWIN)["id"]
    assert member.delete(f"/api/people/{person_id}/").status_code == 204
    response = member.get(f"/api/people/{person_id}/")
    assert (response.status_code, error_code(response)) == (404, "person.not_found")


@pytest.mark.parametrize(
    ("changes", "field"),
    [
        ({"given_names": "", "surname": " "}, "given_names"),
        ({"birth": {"date": exact(1809, 2, 30), "place": ""}}, "birth.date.value.non_field_errors"),
        ({"birth": {"date": {"qualifier": "between", "value": calendar(1760), "until": None}}}, "birth.date"),
        ({"sex": "robot"}, "sex"),
        ({"surname": "D" * 121}, "surname"),
    ],
)
def test_points_validation_errors_at_fields(member: APIClient, changes: dict[str, Any], field: str) -> None:
    response = member.post("/api/people/", DARWIN | changes, format="json")
    assert (response.status_code, error_code(response)) == (400, "validation.invalid")
    assert any(key.startswith(field) for key in response.json()["error"]["fields"]), response.json()


def test_rejects_a_death_before_birth(member: APIClient) -> None:
    payload = DARWIN | {"death": {"date": exact(1800), "place": ""}}
    response = member.post("/api/people/", payload, format="json")
    assert (response.status_code, error_code(response)) == (400, "profile.death_before_birth")


def test_people_are_private_to_their_owner(member: APIClient, other_member: APIClient) -> None:
    person_id = create_person(member, DARWIN)["id"]
    assert other_member.get(f"/api/people/{person_id}/").status_code == 404
    assert other_member.put(f"/api/people/{person_id}/", DARWIN, format="json").status_code == 404
    assert other_member.delete(f"/api/people/{person_id}/").status_code == 404
    assert other_member.get("/api/people/").json()["count"] == 0
    assert member.get(f"/api/people/{person_id}/").status_code == 200


@pytest.mark.parametrize("query", [{"limit": 101}, {"limit": 0}, {"offset": -1}, {"search": "x" * 101}])
def test_rejects_unbounded_listing(member: APIClient, query: dict[str, Any]) -> None:
    assert member.get("/api/people/", query).status_code == 400
