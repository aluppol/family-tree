import io
import os
from typing import Any

from rest_framework.test import APIClient

from family_tree.adapters.persistence.trees import DjangoFamilyTreeRepository
from family_tree.domain.enums import OwnerKind
from family_tree.domain.photos import JPEG_SIGNATURE
from family_tree.domain.workspaces import FamilyTree, WorkspaceOwner
from tests.conftest import ClientFactory


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


def error_message(response: Any) -> str:
    message: str = response.json()["error"]["message"]
    return message


def guest(client_for: ClientFactory, session_id: str) -> APIClient:
    return client_for("shared-guest", roles=("guest",), session_id=session_id)


def people_count(client: APIClient) -> int:
    count: int = client.get("/api/workspace/").json()["people_count"]
    return count


def upload(client: APIClient, path: str, content: bytes, name: str = "family.ged") -> Any:
    file = io.BytesIO(content)
    file.name = name
    return client.post(path, {"file": file}, format="multipart")


def put_photo(client: APIClient, person_id: int, content: bytes, content_type: str = "image/jpeg") -> int:
    status: int = client.put(
        f"/api/people/{person_id}/photo/", content, content_type=content_type
    ).status_code
    return status


def random_jpeg(size: int) -> bytes:
    return JPEG_SIGNATURE + os.urandom(size - len(JPEG_SIGNATURE))


def open_sandbox(client_for: ClientFactory, session_id: str) -> tuple[APIClient, FamilyTree]:
    visitor = guest(client_for, session_id)
    assert visitor.get("/api/workspace/").json()["is_sandbox"] is True
    tree = DjangoFamilyTreeRepository("default").find_by_owner(WorkspaceOwner(OwnerKind.GUEST, session_id))
    assert tree is not None
    return visitor, tree


def gedcom_of(records: list[str]) -> bytes:
    header = ["0 HEAD", "1 GEDC", "2 VERS 5.5.1", "2 FORM LINEAGE-LINKED", "1 CHAR UTF-8"]
    return "\n".join([*header, *records, "0 TRLR"]).encode("utf-8")


def visitors_gedcom(people: int) -> bytes:
    return gedcom_of(
        [
            line
            for number in range(1, people + 1)
            for line in (f"0 @I{number}@ INDI", f"1 NAME Visitor {number} /Caller/")
        ]
    )
