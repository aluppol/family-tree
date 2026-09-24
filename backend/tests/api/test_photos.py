from rest_framework.test import APIClient

from family_tree.domain.photos import JPEG_SIGNATURE, MAX_PHOTO_BYTES, PNG_SIGNATURE
from tests.api.builders import add_person, error_code

JPEG = JPEG_SIGNATURE + bytes(range(64))


def put_photo(client: APIClient, person_id: int, content: bytes, content_type: str = "image/jpeg") -> int:
    status: int = client.put(
        f"/api/people/{person_id}/photo/", content, content_type=content_type
    ).status_code
    return status


def test_stores_and_serves_a_photo(member: APIClient) -> None:
    person_id = add_person(member, "Emma")
    assert put_photo(member, person_id, JPEG) == 204
    response = member.get(f"/api/people/{person_id}/photo/")
    assert (response.status_code, response["Content-Type"], response.content) == (200, "image/jpeg", JPEG)
    assert response["Content-Security-Policy"] == "default-src 'none'; sandbox"
    assert member.get(f"/api/people/{person_id}/").json()["has_photo"] is True


def test_answers_not_modified_for_a_known_photo(member: APIClient) -> None:
    person_id = add_person(member, "Emma")
    put_photo(member, person_id, JPEG)
    entity_tag = member.get(f"/api/people/{person_id}/photo/")["ETag"]
    response = member.get(f"/api/people/{person_id}/photo/", HTTP_IF_NONE_MATCH=entity_tag)
    assert (response.status_code, response.content) == (304, b"")


def test_the_type_comes_from_the_content_not_the_header(member: APIClient) -> None:
    person_id = add_person(member, "Emma")
    put_photo(member, person_id, PNG_SIGNATURE + b"pixels", content_type="image/jpeg")
    assert member.get(f"/api/people/{person_id}/photo/")["Content-Type"] == "image/png"


def test_rejects_files_that_are_not_photos(member: APIClient) -> None:
    person_id = add_person(member, "Emma")
    response = member.put(f"/api/people/{person_id}/photo/", b"GIF89a....", content_type="image/gif")
    assert (response.status_code, error_code(response)) == (400, "photo.unsupported_type")


def test_rejects_large_photos(member: APIClient) -> None:
    person_id = add_person(member, "Emma")
    response = member.put(
        f"/api/people/{person_id}/photo/", JPEG_SIGNATURE + bytes(MAX_PHOTO_BYTES), content_type="image/jpeg"
    )
    assert (response.status_code, error_code(response)) == (400, "photo.too_large")


def test_rejects_other_content_types(member: APIClient) -> None:
    person_id = add_person(member, "Emma")
    assert put_photo(member, person_id, JPEG, content_type="text/plain") == 415


def test_removes_a_photo(member: APIClient) -> None:
    person_id = add_person(member, "Emma")
    put_photo(member, person_id, JPEG)
    assert member.delete(f"/api/people/{person_id}/photo/").status_code == 204
    response = member.get(f"/api/people/{person_id}/photo/")
    assert (response.status_code, error_code(response)) == (404, "photo.not_found")


def test_photos_are_private(member: APIClient, other_member: APIClient) -> None:
    person_id = add_person(member, "Emma")
    put_photo(member, person_id, JPEG)
    assert other_member.get(f"/api/people/{person_id}/photo/").status_code == 404
    assert put_photo(other_member, person_id, JPEG) == 404
