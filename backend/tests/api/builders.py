from typing import Any

from rest_framework.test import APIClient


def calendar(year: int, month: int | None = None, day: int | None = None) -> dict[str, int | None]:
    return {"year": year, "month": month, "day": day}


def exact(year: int, month: int | None = None, day: int | None = None) -> dict[str, Any]:
    return {"qualifier": "exact", "value": calendar(year, month, day), "until": None}


def profile_payload(
    given_names: str, surname: str = "Darwin", born: int | None = None, died: int | None = None
) -> dict[str, Any]:
    return {
        "given_names": given_names,
        "surname": surname,
        "sex": "unknown",
        "birth": {"date": None if born is None else exact(born), "place": ""},
        "death": None if died is None else {"date": exact(died), "place": ""},
        "biography": "",
    }


def create_person(client: APIClient, payload: dict[str, Any]) -> dict[str, Any]:
    response = client.post("/api/people/", payload, format="json")
    assert response.status_code == 201, response.content
    created: dict[str, Any] = response.json()
    return created


def add_person(client: APIClient, given_names: str, born: int | None = None) -> int:
    person_id: int = create_person(client, profile_payload(given_names, born=born))["id"]
    return person_id


def link_parent(client: APIClient, parent_id: int, child_id: int, kind: str = "birth") -> int:
    response = client.post(
        "/api/parent-links/", {"parent_id": parent_id, "child_id": child_id, "kind": kind}, format="json"
    )
    assert response.status_code == 201, response.content
    link_id: int = response.json()["id"]
    return link_id


def marriage_terms(start: int | None = None) -> dict[str, Any]:
    return {
        "kind": "marriage",
        "start": {"date": None if start is None else exact(start), "place": ""},
        "end": None,
    }


def add_partnership(client: APIClient, first_id: int, second_id: int, start: int | None = None) -> int:
    payload = {"first_partner_id": first_id, "second_partner_id": second_id, "terms": marriage_terms(start)}
    response = client.post("/api/partnerships/", payload, format="json")
    assert response.status_code == 201, response.content
    partnership_id: int = response.json()["id"]
    return partnership_id


def error_code(response: Any) -> str:
    code: str = response.json()["error"]["code"]
    return code
