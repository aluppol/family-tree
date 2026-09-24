import time
from io import BytesIO

from rest_framework.test import APIClient

PEOPLE = 5000
IMPORT_SECONDS_LIMIT = 30
CHART_SECONDS_LIMIT = 1


def ahnentafel_gedcom(people: int) -> bytes:
    lines = ["0 HEAD", "1 GEDC", "2 VERS 5.5.1", "2 FORM LINEAGE-LINKED", "1 CHAR UTF-8"]
    for number in range(1, people + 1):
        lines += _individual(number, people)
    for number in (child for child in range(1, people + 1) if _has_parents(child, people)):
        lines += [f"0 @F{number}@ FAM", f"1 HUSB @I{2 * number}@", f"1 WIFE @I{2 * number + 1}@"]
        lines += ["1 MARR", f"2 DATE {_birth_year(number) - 2}", f"1 CHIL @I{number}@"]
    lines.append("0 TRLR")
    return "\n".join(lines).encode("utf-8")


def test_a_five_thousand_person_tree_imports_and_opens_quickly(member: APIClient) -> None:
    started = time.perf_counter()
    upload = BytesIO(ahnentafel_gedcom(PEOPLE))
    upload.name = "ahnentafel.ged"
    response = member.post("/api/gedcom/import/", {"file": upload}, format="multipart")
    import_seconds = time.perf_counter() - started
    assert (response.status_code, response.json()["people_count"]) == (201, PEOPLE), response.content
    focus = response.json()["home_person_id"]
    started = time.perf_counter()
    chart = member.get(f"/api/people/{focus}/chart/", {"ancestors": "8", "descendants": "6"}).json()
    chart_seconds = time.perf_counter() - started
    assert len(chart["people"]) == 2**9 - 1
    assert (import_seconds < IMPORT_SECONDS_LIMIT, chart_seconds < CHART_SECONDS_LIMIT) == (True, True), (
        f"import {import_seconds:.1f} s, chart {chart_seconds:.2f} s"
    )


def _individual(number: int, people: int) -> list[str]:
    sex = "M" if number % 2 == 0 else "F"
    family_links = [f"1 FAMC @F{number}@"] if _has_parents(number, people) else []
    if number > 1 and _has_parents(number // 2, people):
        family_links.append(f"1 FAMS @F{number // 2}@")
    return [
        f"0 @I{number}@ INDI",
        f"1 NAME Person {number} /Line{number.bit_length()}/",
        f"1 SEX {sex}",
        "1 BIRT",
        f"2 DATE {_birth_year(number)}",
        *family_links,
    ]


def _birth_year(number: int) -> int:
    return 2000 - 25 * (number.bit_length() - 1)


def _has_parents(number: int, people: int) -> bool:
    return 2 * number + 1 <= people
