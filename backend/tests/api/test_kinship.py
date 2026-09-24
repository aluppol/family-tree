from typing import Any

import pytest
from rest_framework.test import APIClient

from tests.api.builders import (
    add_partnership,
    add_person,
    error_code,
    exact,
    link_parent,
    marriage_terms,
    profile_payload,
)


def post_link(client: APIClient, parent_id: int, child_id: int, kind: str = "birth") -> Any:
    return client.post(
        "/api/parent-links/", {"parent_id": parent_id, "child_id": child_id, "kind": kind}, format="json"
    )


def test_linked_parents_and_children_appear_on_both_profiles(member: APIClient) -> None:
    robert, susannah, charles = (
        add_person(member, "Robert", 1766),
        add_person(member, "Susannah", 1765),
        add_person(member, "Charles", 1809),
    )
    link_parent(member, robert, charles)
    link_parent(member, susannah, charles, kind="adopted")
    parents = member.get(f"/api/people/{charles}/").json()["parents"]
    assert [(parent["person"]["id"], parent["kind"]) for parent in parents] == [
        (robert, "birth"),
        (susannah, "adopted"),
    ]
    children = member.get(f"/api/people/{robert}/").json()["children"]
    assert [child["person"]["given_names"] for child in children] == ["Charles"]


def test_children_are_ordered_by_birth(member: APIClient) -> None:
    parent = add_person(member, "Charles", 1809)
    for given_names, born in [("George", 1845), ("William", 1839), ("Anne", 1841)]:
        link_parent(member, parent, add_person(member, given_names, born))
    children = member.get(f"/api/people/{parent}/").json()["children"]
    assert [child["person"]["given_names"] for child in children] == ["William", "Anne", "George"]


def test_explains_each_kinship_rule(member: APIClient) -> None:
    grandfather, father, child = (
        add_person(member, "Josiah", 1730),
        add_person(member, "Robert", 1766),
        add_person(member, "Charles", 1809),
    )
    link_parent(member, grandfather, father)
    link_parent(member, father, child)
    later_parent, second_parent = add_person(member, "Late", 1850), add_person(member, "Second", 1770)
    link_parent(member, second_parent, child)
    violations = {
        "kinship.self_parent": post_link(member, child, child),
        "kinship.duplicate_parent": post_link(member, father, child, kind="adopted"),
        "kinship.cycle": post_link(member, child, grandfather),
        "kinship.parent_born_after_child": post_link(member, later_parent, child),
        "kinship.too_many_birth_parents": post_link(member, grandfather, child),
    }
    assert {code: (response.status_code, error_code(response)) for code, response in violations.items()} == {
        code: (400, code) for code in violations
    }


def test_a_third_parent_can_be_adoptive(member: APIClient) -> None:
    child = add_person(member, "Child", 1900)
    link_parent(member, add_person(member, "Mother", 1870), child)
    link_parent(member, add_person(member, "Father", 1868), child)
    assert post_link(member, add_person(member, "Guardian", 1860), child, kind="foster").status_code == 201


def test_changes_the_kind_and_removes_links(member: APIClient) -> None:
    child = add_person(member, "Child", 1900)
    link_id = link_parent(member, add_person(member, "Mother", 1870), child)
    changed = member.put(f"/api/parent-links/{link_id}/", {"kind": "foster"}, format="json")
    assert (changed.status_code, changed.json()["kind"]) == (200, "foster")
    assert member.delete(f"/api/parent-links/{link_id}/").status_code == 204
    assert member.get(f"/api/people/{child}/").json()["parents"] == []
    assert member.delete(f"/api/parent-links/{link_id}/").status_code == 404


def test_a_new_birth_date_must_fit_the_family(member: APIClient) -> None:
    father, child = add_person(member, "Robert", 1766), add_person(member, "Charles", 1809)
    link_parent(member, father, child)
    late_father = profile_payload("Robert", born=1815)
    early_child = profile_payload("Charles", born=1750)
    too_late = member.put(f"/api/people/{father}/", late_father, format="json")
    too_early = member.put(f"/api/people/{child}/", early_child, format="json")
    assert (error_code(too_late), error_code(too_early)) == (
        "profile.born_after_child",
        "profile.born_before_parent",
    )


def test_candidates_leave_out_impossible_relatives(member: APIClient) -> None:
    grandfather, father, child = (
        add_person(member, "Josiah", 1730),
        add_person(member, "Robert", 1766),
        add_person(member, "Charles", 1809),
    )
    stranger = add_person(member, "Stranger", 1770)
    link_parent(member, grandfather, father)
    link_parent(member, father, child)

    def candidate_ids(kind: str, person_id: int) -> set[int]:
        return {
            candidate["id"] for candidate in member.get(f"/api/people/{person_id}/{kind}-candidates/").json()
        }

    assert candidate_ids("parent", father) == {stranger}
    assert candidate_ids("child", father) == {stranger}
    assert candidate_ids("partner", father) == {grandfather, child, stranger}


def test_candidate_search_filters_by_name(member: APIClient) -> None:
    person = add_person(member, "Charles", 1809)
    add_person(member, "Emma", 1808)
    add_person(member, "Erasmus", 1731)
    found = member.get(f"/api/people/{person}/partner-candidates/", {"search": "emm"}).json()
    assert [candidate["given_names"] for candidate in found] == ["Emma"]


def test_partnership_lifecycle(member: APIClient) -> None:
    charles, emma = add_person(member, "Charles", 1809), add_person(member, "Emma", 1808)
    partnership_id = add_partnership(member, charles, emma, start=1839)
    partners = member.get(f"/api/people/{emma}/").json()["partnerships"]
    assert [(entry["partner"]["id"], entry["terms"]["start"]["date"]) for entry in partners] == [
        (charles, exact(1839))
    ]
    ended = marriage_terms(1839) | {"end": {"reason": "divorce", "date": exact(1850)}}
    changed = member.put(f"/api/partnerships/{partnership_id}/", {"terms": ended}, format="json")
    assert (changed.status_code, changed.json()["terms"]["end"]["reason"]) == (200, "divorce")
    assert member.delete(f"/api/partnerships/{partnership_id}/").status_code == 204
    assert member.get(f"/api/people/{emma}/").json()["partnerships"] == []


def test_the_same_couple_can_marry_twice(member: APIClient) -> None:
    first, second = add_person(member, "Richard", 1925), add_person(member, "Elizabeth", 1932)
    add_partnership(member, first, second, start=1964)
    add_partnership(member, first, second, start=1975)
    assert len(member.get(f"/api/people/{first}/").json()["partnerships"]) == 2


@pytest.mark.parametrize(
    ("terms", "code"),
    [
        (
            marriage_terms(1839) | {"end": {"reason": "divorce", "date": exact(1830)}},
            "partnership.ends_before_start",
        ),
        (marriage_terms() | {"kind": "friendship"}, "validation.invalid"),
    ],
)
def test_partnership_rules(member: APIClient, terms: dict[str, Any], code: str) -> None:
    payload = {
        "first_partner_id": add_person(member, "A"),
        "second_partner_id": add_person(member, "B"),
        "terms": terms,
    }
    response = member.post("/api/partnerships/", payload, format="json")
    assert (response.status_code, error_code(response)) == (400, code)


def test_nobody_partners_themselves(member: APIClient) -> None:
    person = add_person(member, "Narcissus")
    payload = {"first_partner_id": person, "second_partner_id": person, "terms": marriage_terms()}
    assert error_code(member.post("/api/partnerships/", payload, format="json")) == "kinship.self_partner"


def test_other_workspaces_cannot_be_linked(member: APIClient, other_member: APIClient) -> None:
    mine, theirs = add_person(member, "Mine"), add_person(other_member, "Theirs")
    response = post_link(member, theirs, mine)
    assert (response.status_code, error_code(response)) == (404, "person.not_found")


def test_deleting_a_person_removes_their_links(member: APIClient) -> None:
    father, child = add_person(member, "Robert", 1766), add_person(member, "Charles", 1809)
    link_parent(member, father, child)
    add_partnership(member, father, add_person(member, "Susannah", 1765))
    member.delete(f"/api/people/{father}/")
    assert member.get(f"/api/people/{child}/").json()["parents"] == []
