from rest_framework.test import APIClient

from tests.api.builders import add_person, error_code


def test_the_viewer_is_the_signed_in_person(member: APIClient) -> None:
    assert member.get("/api/me/").json() == {
        "username": "member-one.login",
        "display_name": "Member-One Tester",
        "is_guest": False,
    }


def test_a_new_member_starts_with_an_empty_tree(member: APIClient) -> None:
    assert member.get("/api/workspace/").json() == {
        "home_person_id": None,
        "people_count": 0,
        "is_sandbox": False,
    }


def test_the_home_person_can_be_chosen_and_cleared(member: APIClient) -> None:
    person_id = add_person(member, "Charles")
    chosen = member.put("/api/workspace/home-person/", {"person_id": person_id}, format="json").json()
    cleared = member.put("/api/workspace/home-person/", {"person_id": None}, format="json").json()
    assert (chosen["home_person_id"], chosen["people_count"], cleared["home_person_id"]) == (
        person_id,
        1,
        None,
    )


def test_the_home_person_must_be_in_the_tree(member: APIClient, other_member: APIClient) -> None:
    theirs = add_person(other_member, "Theirs")
    response = member.put("/api/workspace/home-person/", {"person_id": theirs}, format="json")
    assert (response.status_code, error_code(response)) == (404, "person.not_found")


def test_deleting_the_home_person_clears_it(member: APIClient) -> None:
    person_id = add_person(member, "Charles")
    member.put("/api/workspace/home-person/", {"person_id": person_id}, format="json")
    member.delete(f"/api/people/{person_id}/")
    assert member.get("/api/workspace/").json()["home_person_id"] is None
