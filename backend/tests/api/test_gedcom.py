import io
import zipfile
from pathlib import Path
from typing import Any

import pytest
from rest_framework.test import APIClient

from family_tree.adapters.demo.bundled import DEMO_FAMILY_FILE
from tests.api.builders import error_code

SMALL_FAMILY = b"""0 HEAD
1 GEDC
2 VERS 5.5.1
2 FORM LINEAGE-LINKED
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Robert Waring /Darwin/
1 SEX M
1 BIRT
2 DATE 30 MAY 1766
1 FAMS @F1@
0 @I2@ INDI
1 NAME Susannah /Wedgwood/
1 SEX F
1 BIRT
2 DATE 3 JAN 1765
1 FAMS @F1@
0 @I3@ INDI
1 NAME Charles Robert /Darwin/
1 SEX M
1 BIRT
2 DATE 12 FEB 1809
1 OCCU Naturalist
1 FAMC @F1@
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
1 MARR
2 DATE 18 APR 1796
0 TRLR
"""


def upload(client: APIClient, path: str, content: bytes, name: str = "family.ged") -> Any:
    file = io.BytesIO(content)
    file.name = name
    return client.post(path, {"file": file}, format="multipart")


def people_count(client: APIClient) -> int:
    count: int = client.get("/api/workspace/").json()["people_count"]
    return count


def test_preview_reports_without_saving(member: APIClient) -> None:
    response = upload(member, "/api/gedcom/preview/", SMALL_FAMILY)
    report = response.json()
    assert (response.status_code, report["people_count"], report["parent_link_count"]) == (200, 3, 2)
    assert (report["partnership_count"], people_count(member)) == (1, 0)
    assert any("occupation" in skipped["reason"] for skipped in report["skipped"]), report["skipped"]


def test_import_adds_the_family_and_sets_the_home_person(member: APIClient) -> None:
    response = upload(member, "/api/gedcom/import/", SMALL_FAMILY)
    assert (response.status_code, response.json()["people_count"], people_count(member)) == (201, 3, 3)
    home = member.get("/api/workspace/").json()["home_person_id"]
    robert = member.get(f"/api/people/{home}/").json()
    assert (robert["given_names"], [child["person"]["given_names"] for child in robert["children"]]) == (
        "Robert Waring",
        ["Charles Robert"],
    )


@pytest.mark.parametrize(
    ("content", "code"),
    [
        (b"not a gedcom file at all", "gedcom.unreadable"),
        (SMALL_FAMILY.replace(b"1 SEX M\n", b"3 SEX M\n", 1), "gedcom.unreadable"),
    ],
)
def test_a_broken_file_saves_nothing(member: APIClient, content: bytes, code: str) -> None:
    response = upload(member, "/api/gedcom/import/", content)
    assert (response.status_code, error_code(response), people_count(member)) == (400, code, 0)


def test_refuses_an_oversized_upload_before_reading_it(member: APIClient) -> None:
    file = io.BytesIO(SMALL_FAMILY)
    file.name = "family.ged"
    response = member.post(
        "/api/gedcom/import/", {"file": file}, format="multipart", CONTENT_LENGTH=str(50 * 1024 * 1024)
    )
    assert (response.status_code, error_code(response)) == (413, "request.too_large")


def test_rejects_a_request_without_a_file(member: APIClient) -> None:
    response = member.post("/api/gedcom/import/", {}, format="multipart")
    assert (response.status_code, list(response.json()["error"]["fields"])) == (400, ["file"])


@pytest.mark.parametrize(
    ("export_format", "filename", "content_type"),
    [
        ("gedcom-5.5.1", "family-tree.ged", "text/plain; charset=utf-8"),
        ("gedcom-7.0", "family-tree.ged", "text/plain; charset=utf-8"),
        ("gedzip", "family-tree.gdz", "application/zip"),
    ],
)
def test_exports_download_as_files(
    member: APIClient, export_format: str, filename: str, content_type: str
) -> None:
    upload(member, "/api/gedcom/import/", SMALL_FAMILY)
    response = member.get("/api/gedcom/export/", {"format": export_format})
    assert (response.status_code, response["Content-Type"]) == (200, content_type)
    assert response["Content-Disposition"] == f'attachment; filename="{filename}"'


def test_rejects_an_unknown_export_format(member: APIClient) -> None:
    assert member.get("/api/gedcom/export/", {"format": "csv"}).status_code == 400


@pytest.mark.parametrize("export_format", ["gedcom-5.5.1", "gedcom-7.0", "gedzip"])
def test_an_export_imports_back_without_losses(
    member: APIClient, other_member: APIClient, export_format: str
) -> None:
    upload(member, "/api/gedcom/import/", DEMO_FAMILY_FILE.read_bytes())
    exported = member.get("/api/gedcom/export/", {"format": export_format}).content
    response = upload(other_member, "/api/gedcom/import/", exported, name="export.bin")
    assert (response.status_code, response.json()["skipped"]) == (201, [])
    assert snapshot(other_member) == snapshot(member)


def test_a_gedzip_export_carries_photos(member: APIClient) -> None:
    upload(member, "/api/gedcom/import/", SMALL_FAMILY)
    home = member.get("/api/workspace/").json()["home_person_id"]
    member.put(f"/api/people/{home}/photo/", b"\xff\xd8\xff" + bytes(32), content_type="image/jpeg")
    archive = zipfile.ZipFile(io.BytesIO(member.get("/api/gedcom/export/", {"format": "gedzip"}).content))
    photos = [Path(name).suffix for name in archive.namelist() if name != "gedcom.ged"]
    assert photos == [".jpg"]


def snapshot(client: APIClient) -> list[tuple[Any, ...]]:
    people = client.get("/api/people/", {"limit": "100"}).json()["results"]
    return sorted(_person_facts(client, person["id"]) for person in people)


def _person_facts(client: APIClient, person_id: int) -> tuple[Any, ...]:
    person = client.get(f"/api/people/{person_id}/").json()
    return (
        person["given_names"],
        person["surname"],
        person["sex"],
        repr(person["birth"]),
        repr(person["death"]),
        person["biography"],
        sorted((parent["person"]["given_names"], parent["kind"]) for parent in person["parents"]),
        sorted((entry["partner"]["given_names"], repr(entry["terms"])) for entry in person["partnerships"]),
    )
