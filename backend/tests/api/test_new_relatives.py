from typing import Any

import pytest
from rest_framework.test import APIClient

from family_tree.domain.allowances import GUEST_ALLOWANCE
from family_tree.domain.enums import UsageMeasure
from tests.api.builders import (
    add_person,
    error_code,
    exact,
    link_parent,
    marriage_terms,
    open_sandbox,
    people_count,
    profile_payload,
    upload,
    visitors_gedcom,
)
from tests.conftest import ClientFactory

PEOPLE_CEILING = GUEST_ALLOWANCE.ceilings[UsageMeasure.PEOPLE]
RELATIVES = ("parents", "children", "spouses")


def new_relative(relatives: str, person: dict[str, Any]) -> dict[str, Any]:
    if relatives == "spouses":
        return {"person": person, "terms": marriage_terms()}
    return {"person": person, "kind": "adopted"}


def post_new_relative(client: APIClient, person_id: int, relatives: str, body: dict[str, Any]) -> Any:
    return client.post(f"/api/people/{person_id}/{relatives}/", body, format="json")


def summary(person_id: int, given_names: str, born: int) -> dict[str, Any]:
    return {
        "id": person_id,
        "given_names": given_names,
        "surname": "Darwin",
        "sex": "unknown",
        "birth_date": exact(born),
        "death_date": None,
        "is_deceased": False,
        "has_photo": False,
    }


def dossier(profile: dict[str, Any], person_id: int, **relatives: list[dict[str, Any]]) -> dict[str, Any]:
    empty = {"id": person_id, "has_photo": False, "parents": [], "children": [], "partnerships": []}
    return profile | empty | relatives


def test_a_new_parent_is_added_and_linked_to_the_child(member: APIClient) -> None:
    charles = add_person(member, "Charles", 1809)
    robert = profile_payload("Robert", born=1766)
    response = post_new_relative(member, charles, "parents", {"person": robert, "kind": "adopted"})
    assert response.status_code == 201, response.content
    parent_id = response.json()["id"]
    parents = member.get(f"/api/people/{charles}/").json()["parents"]
    link_id = parents[0]["link_id"]
    assert parents == [{"link_id": link_id, "kind": "adopted", "person": summary(parent_id, "Robert", 1766)}]
    child = {"link_id": link_id, "kind": "adopted", "person": summary(charles, "Charles", 1809)}
    assert response.json() == dossier(robert, parent_id, children=[child])


def test_a_new_child_is_added_and_linked_to_the_parent(member: APIClient) -> None:
    robert = add_person(member, "Robert", 1766)
    charles = profile_payload("Charles", born=1809)
    response = post_new_relative(member, robert, "children", {"person": charles, "kind": "foster"})
    assert response.status_code == 201, response.content
    child_id = response.json()["id"]
    children = member.get(f"/api/people/{robert}/").json()["children"]
    link_id = children[0]["link_id"]
    assert children == [{"link_id": link_id, "kind": "foster", "person": summary(child_id, "Charles", 1809)}]
    parent = {"link_id": link_id, "kind": "foster", "person": summary(robert, "Robert", 1766)}
    assert response.json() == dossier(charles, child_id, parents=[parent])


def test_a_new_spouse_is_added_with_the_terms_of_the_marriage(member: APIClient) -> None:
    charles = add_person(member, "Charles", 1809)
    emma = profile_payload("Emma", born=1808)
    terms = marriage_terms() | {"start": {"date": exact(1839, 1, 29), "place": "Maer"}}
    response = post_new_relative(member, charles, "spouses", {"person": emma, "terms": terms})
    assert response.status_code == 201, response.content
    spouse_id = response.json()["id"]
    marriages = member.get(f"/api/people/{charles}/").json()["partnerships"]
    marriage_id = marriages[0]["partnership_id"]
    assert marriages == [
        {"partnership_id": marriage_id, "terms": terms, "partner": summary(spouse_id, "Emma", 1808)}
    ]
    husband = {"partnership_id": marriage_id, "terms": terms, "partner": summary(charles, "Charles", 1809)}
    assert response.json() == dossier(emma, spouse_id, partnerships=[husband])


@pytest.mark.parametrize(
    ("relatives", "body", "code"),
    [
        ("parents", {"person": profile_payload("Third"), "kind": "birth"}, "kinship.too_many_birth_parents"),
        (
            "children",
            {"person": profile_payload("Early", born=1850), "kind": "birth"},
            "kinship.parent_born_after_child",
        ),
        (
            "spouses",
            {
                "person": profile_payload("Brief"),
                "terms": marriage_terms(1920) | {"end": {"reason": "divorce", "date": exact(1910)}},
            },
            "partnership.ends_before_start",
        ),
    ],
)
def test_a_relationship_the_rules_refuse_keeps_neither_the_person_nor_the_link(
    member: APIClient, relatives: str, body: dict[str, Any], code: str
) -> None:
    person = add_person(member, "Anchor", 1900)
    link_parent(member, add_person(member, "Mother", 1870), person)
    link_parent(member, add_person(member, "Father", 1868), person)
    before = (people_count(member), member.get(f"/api/people/{person}/").json())
    response = post_new_relative(member, person, relatives, body)
    assert (response.status_code, error_code(response)) == (400, code)
    assert (people_count(member), member.get(f"/api/people/{person}/").json()) == before


@pytest.mark.parametrize("relatives", RELATIVES)
def test_a_new_person_who_dies_before_being_born_is_refused(member: APIClient, relatives: str) -> None:
    person = add_person(member, "Anchor")
    body = new_relative(relatives, profile_payload("Ghost", born=1900, died=1850))
    response = post_new_relative(member, person, relatives, body)
    assert (response.status_code, error_code(response), people_count(member)) == (
        400,
        "profile.death_before_birth",
        1,
    )


@pytest.mark.parametrize(
    ("relatives", "body", "field"),
    [
        ("parents", {"person": profile_payload("Kindless")}, "kind"),
        ("children", {"person": profile_payload("", surname=""), "kind": "birth"}, "person.given_names"),
        ("spouses", {"person": profile_payload("Termless")}, "terms"),
    ],
)
def test_invalid_input_points_at_its_fields(
    member: APIClient, relatives: str, body: dict[str, Any], field: str
) -> None:
    person = add_person(member, "Anchor")
    response = post_new_relative(member, person, relatives, body)
    assert (response.status_code, error_code(response), people_count(member)) == (
        400,
        "validation.invalid",
        1,
    )
    assert field in response.json()["error"]["fields"], response.json()


@pytest.mark.parametrize("relatives", RELATIVES)
def test_a_person_of_another_tree_gets_no_new_relative(
    member: APIClient, other_member: APIClient, relatives: str
) -> None:
    theirs = add_person(other_member, "Theirs")
    before = other_member.get(f"/api/people/{theirs}/").json()
    response = post_new_relative(member, theirs, relatives, new_relative(relatives, profile_payload("Mine")))
    assert (response.status_code, error_code(response)) == (404, "person.not_found")
    assert (people_count(member), other_member.get(f"/api/people/{theirs}/").json()) == (0, before)


@pytest.mark.parametrize("relatives", RELATIVES)
def test_the_person_is_looked_up_before_the_new_person_is_judged(
    member: APIClient, other_member: APIClient, relatives: str
) -> None:
    theirs = add_person(other_member, "Theirs")
    body = new_relative(relatives, profile_payload("Ghost", born=1900, died=1850))
    response = post_new_relative(member, theirs, relatives, body)
    assert (response.status_code, error_code(response)) == (404, "person.not_found")


@pytest.mark.parametrize("relatives", RELATIVES)
def test_only_a_signed_in_person_with_a_role_adds_a_new_relative(
    anonymous: APIClient, client_for: ClientFactory, relatives: str
) -> None:
    body = new_relative(relatives, profile_payload("Nobody"))
    unauthenticated = post_new_relative(anonymous, 1, relatives, body)
    forbidden = post_new_relative(client_for("outsider", roles=()), 1, relatives, body)
    assert (unauthenticated.status_code, error_code(unauthenticated)) == (401, "auth.unauthenticated")
    assert (forbidden.status_code, error_code(forbidden)) == (403, "auth.forbidden")


@pytest.mark.parametrize("relatives", RELATIVES)
def test_a_full_sandbox_refuses_a_new_relative_and_keeps_nothing(
    client_for: ClientFactory, relatives: str
) -> None:
    visitor, tree = open_sandbox(client_for, f"full-{relatives}")
    home = tree.home_person_id
    assert home is not None
    assert (
        upload(
            visitor, "/api/gedcom/import/", visitors_gedcom(PEOPLE_CEILING - people_count(visitor))
        ).status_code
        == 201
    )
    before = visitor.get(f"/api/people/{home}/").json()
    response = post_new_relative(
        visitor, home, relatives, new_relative(relatives, profile_payload("One more"))
    )
    assert (response.status_code, error_code(response)) == (400, "workspace.limit_reached")
    assert (people_count(visitor), visitor.get(f"/api/people/{home}/").json()) == (PEOPLE_CEILING, before)
