import pytest

from family_tree.domain.enums import PhotoType, Sex
from family_tree.domain.errors import InvalidInput
from family_tree.domain.identifiers import PersonId
from family_tree.domain.people import LifeEvent, PersonProfile
from family_tree.domain.photos import JPEG_SIGNATURE, MAX_PHOTO_BYTES, PNG_SIGNATURE, photo_from_bytes
from family_tree.domain.read_models import ChartScope, PeopleQuery


def profile(given_names: str = "Emma", surname: str = "Wedgwood", place: str = "") -> PersonProfile:
    return PersonProfile(
        given_names=given_names,
        surname=surname,
        sex=Sex.FEMALE,
        birth=LifeEvent(place=place),
        death=None,
        biography="",
    )


def test_a_person_needs_a_name() -> None:
    with pytest.raises(InvalidInput) as raised:
        profile(given_names=" ", surname="")
    assert raised.value.fields == {"given_names": ["Give at least a given name or a surname."]}


@pytest.mark.parametrize(("given_names", "surname"), [("Emma", ""), ("", "Wedgwood")])
def test_one_name_is_enough(given_names: str, surname: str) -> None:
    assert profile(given_names, surname).full_name() == (given_names or surname)


@pytest.mark.parametrize(
    ("given_names", "place", "field"),
    [("E" * 121, "", "given_names"), ("Emma", "P" * 201, "place")],
)
def test_texts_have_length_limits(given_names: str, place: str, field: str) -> None:
    with pytest.raises(InvalidInput) as raised:
        profile(given_names=given_names, place=place)
    assert list(raised.value.fields) == [field]


def test_death_is_optional_and_marks_the_person_deceased() -> None:
    living = profile()
    assert (living.is_deceased(), living.death_date()) == (False, None)


@pytest.mark.parametrize(
    ("content", "media_type"),
    [
        (JPEG_SIGNATURE + b"rest", PhotoType.JPEG),
        (PNG_SIGNATURE + b"rest", PhotoType.PNG),
        (b"RIFF\x00\x00\x00\x00WEBPVP8 ", PhotoType.WEBP),
    ],
)
def test_photo_type_comes_from_the_bytes(content: bytes, media_type: PhotoType) -> None:
    assert photo_from_bytes(content).media_type is media_type


@pytest.mark.parametrize(
    ("content", "code"),
    [
        (b"GIF89a", "photo.unsupported_type"),
        (b"<svg xmlns='http://www.w3.org/2000/svg'/>", "photo.unsupported_type"),
        (JPEG_SIGNATURE + b"x" * MAX_PHOTO_BYTES, "photo.too_large"),
    ],
)
def test_rejects_other_files(content: bytes, code: str) -> None:
    with pytest.raises(InvalidInput) as raised:
        photo_from_bytes(content)
    assert raised.value.code == code


@pytest.mark.parametrize(
    ("offset", "limit", "text"),
    [(-1, 10, ""), (0, 0, ""), (0, 101, ""), (0, 10, "x" * 101)],
)
def test_people_queries_are_bounded(offset: int, limit: int, text: str) -> None:
    with pytest.raises(InvalidInput):
        PeopleQuery(text=text, offset=offset, limit=limit)


@pytest.mark.parametrize(("ancestors", "descendants"), [(-1, 0), (9, 0), (0, 7)])
def test_chart_scopes_are_bounded(ancestors: int, descendants: int) -> None:
    with pytest.raises(InvalidInput):
        ChartScope(focus_id=PersonId(1), ancestor_generations=ancestors, descendant_generations=descendants)
