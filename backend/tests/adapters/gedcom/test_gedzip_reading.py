import io
import struct
import zipfile

import pytest

from family_tree.adapters.gedcom.reader import GedcomReader
from family_tree.domain.enums import PhotoType
from family_tree.domain.errors import InvalidInput
from family_tree.domain.photos import Photo
from tests.adapters.gedcom.builders import gedcom_bytes, gedzip_bytes, jpeg_bytes, png_bytes, webp_bytes
from tests.contract import ContractCase, case_ids

MEGABYTE = 1024 * 1024
HEADER = "0 HEAD\n1 GEDC\n2 VERS 7.0"
GIF = b"GIF89a\x01\x00\x01\x00\x00\x00\x00;"
DAMAGED = "The GEDZIP file is damaged or uses an unsupported zip feature."
UNUSED_PHOTO = b"never-read-photo-bytes"


def archive_with_anne(
    *anne_lines: str, records: tuple[str, ...] = (), media: dict[str, bytes] | None = None
) -> bytes:
    gedcom = gedcom_bytes(HEADER, "0 @I1@ INDI", "1 NAME Anne /Darwin/", *anne_lines, *records, "0 TRLR")
    return gedzip_bytes(gedcom, media or {})


def media_record(xref: str, path: str, media_type: str) -> tuple[str, ...]:
    return (f"0 {xref} OBJE", f"1 FILE {path}", f"2 FORM {media_type}")


PHOTO_CASES: list[ContractCase] = [
    {
        "id": "photo_from_a_media_record",
        "input_overrides": {
            "payload": archive_with_anne(
                "1 OBJE @O1@",
                records=media_record("@O1@", "media/anne.jpg", "image/jpeg"),
                media={"media/anne.jpg": jpeg_bytes()},
            )
        },
        "expected_overrides": {"photo": Photo(PhotoType.JPEG, jpeg_bytes()), "skipped": ()},
    },
    {
        "id": "photo_from_an_inline_gedcom551_media_link",
        "input_overrides": {
            "payload": archive_with_anne(
                "1 OBJE",
                "2 FILE photos/anne.png",
                "3 FORM png",
                "4 TYPE photo",
                media={"photos/anne.png": png_bytes()},
            )
        },
        "expected_overrides": {"photo": Photo(PhotoType.PNG, png_bytes()), "skipped": ()},
    },
    {
        "id": "percent_encoded_and_dot_relative_paths",
        "input_overrides": {
            "payload": archive_with_anne(
                "1 OBJE @O1@",
                records=media_record("@O1@", "./media/Anne%20Darwin.webp", "image/webp"),
                media={"media/Anne Darwin.webp": webp_bytes(), "media/": b""},
            )
        },
        "expected_overrides": {"photo": Photo(PhotoType.WEBP, webp_bytes()), "skipped": ()},
    },
    {
        "id": "first_media_file_found_in_the_archive_wins",
        "input_overrides": {
            "payload": archive_with_anne(
                "1 OBJE @O1@",
                "1 OBJE @O2@",
                "1 OBJE @O3@",
                records=(
                    *media_record("@O1@", "https://example.com/anne.jpg", "image/jpeg"),
                    *media_record("@O2@", "media/anne.png", "image/png"),
                    *media_record("@O3@", "media/anne.jpg", "image/jpeg"),
                ),
                media={"media/anne.png": png_bytes(), "media/anne.jpg": jpeg_bytes()},
            )
        },
        "expected_overrides": {"photo": Photo(PhotoType.PNG, png_bytes()), "skipped": ()},
    },
    {
        "id": "media_file_missing_from_the_archive_is_reported",
        "input_overrides": {
            "payload": archive_with_anne(
                "1 OBJE @O1@", records=media_record("@O1@", "media/lost.jpg", "image/jpeg")
            )
        },
        "expected_overrides": {
            "photo": None,
            "skipped": (
                ("@I1@ OBJE", "'media/lost.jpg' is not in the GEDZIP file, so the photo is skipped."),
            ),
        },
    },
    {
        "id": "unsupported_image_type_is_reported",
        "input_overrides": {
            "payload": archive_with_anne(
                "1 OBJE @O1@",
                records=media_record("@O1@", "media/anne.gif", "image/gif"),
                media={"media/anne.gif": GIF},
            )
        },
        "expected_overrides": {
            "photo": None,
            "skipped": (
                ("@I1@ OBJE", "'media/anne.gif' is not imported. A photo must be a JPEG, PNG or WebP image."),
            ),
        },
    },
    {
        "id": "photo_declared_over_two_megabytes_is_reported",
        "input_overrides": {
            "payload": archive_with_anne(
                "1 OBJE @O1@",
                records=media_record("@O1@", "media/large.jpg", "image/jpeg"),
                media={"media/large.jpg": jpeg_bytes() + b"\x00" * (2 * MEGABYTE)},
            )
        },
        "expected_overrides": {
            "photo": None,
            "skipped": (("@I1@ OBJE", "'media/large.jpg' is larger than 2 MB, so the photo is skipped."),),
        },
    },
    {
        "id": "broken_media_pointer_is_reported",
        "input_overrides": {"payload": archive_with_anne("1 OBJE @O9@")},
        "expected_overrides": {
            "photo": None,
            "skipped": (
                ("@I1@ OBJE", "@O9@ does not point to a media record in this file, so the link is skipped."),
            ),
        },
    },
    {
        "id": "void_media_pointer_and_media_without_files_are_ignored",
        "input_overrides": {"payload": archive_with_anne("1 OBJE @VOID@", "1 OBJE", "2 TITL Portrait")},
        "expected_overrides": {"photo": None, "skipped": (("INDI.OBJE.TITL", "1 title is not imported."),)},
    },
    {
        "id": "person_without_media_has_no_photo",
        "input_overrides": {
            "payload": archive_with_anne(records=media_record("@O1@", "media/x.jpg", "image/jpeg"))
        },
        "expected_overrides": {"photo": None, "skipped": ()},
    },
]


@pytest.mark.parametrize("case", PHOTO_CASES, ids=case_ids(PHOTO_CASES))
def test_gedzip_photos_follow_the_contract(case: ContractCase) -> None:
    document = GedcomReader().read(case["input_overrides"]["payload"])
    actual = {
        "photo": document.people[0].photo,
        "skipped": tuple((record.location, record.reason) for record in document.skipped),
    }
    assert actual == case["expected_overrides"]


ARCHIVE_CASES: list[ContractCase] = [
    {
        "id": "archive_without_gedcom_file",
        "input_overrides": {"members": {"family.ged": gedcom_bytes(HEADER, "0 TRLR")}},
        "expected_overrides": {"code": "gedcom.unreadable", "message": "The GEDZIP file has no gedcom.ged."},
    },
    {
        "id": "empty_archive",
        "input_overrides": {"members": {}},
        "expected_overrides": {"code": "gedcom.unreadable", "message": "The GEDZIP file has no gedcom.ged."},
    },
    {
        "id": "path_traversal",
        "input_overrides": {"members": {"gedcom.ged": b"", "media/../../escape.jpg": jpeg_bytes()}},
        "expected_overrides": {
            "code": "gedcom.unreadable",
            "message": "The GEDZIP file contains the unsafe path 'media/../../escape.jpg'.",
        },
    },
    {
        "id": "absolute_path",
        "input_overrides": {"members": {"gedcom.ged": b"", "/etc/passwd": b"root"}},
        "expected_overrides": {
            "code": "gedcom.unreadable",
            "message": "The GEDZIP file contains the unsafe path '/etc/passwd'.",
        },
    },
    {
        "id": "windows_drive_path",
        "input_overrides": {"members": {"gedcom.ged": b"", "C:/photos/anne.jpg": jpeg_bytes()}},
        "expected_overrides": {
            "code": "gedcom.unreadable",
            "message": "The GEDZIP file contains the unsafe path 'C:/photos/anne.jpg'.",
        },
    },
    {
        "id": "backslash_path",
        "input_overrides": {"members": {"gedcom.ged": b"", "media\\..\\anne.jpg": jpeg_bytes()}},
        "expected_overrides": {
            "code": "gedcom.unreadable",
            "message": "The GEDZIP file contains the unsafe path 'media\\..\\anne.jpg'.",
        },
    },
]


@pytest.mark.parametrize("case", ARCHIVE_CASES, ids=case_ids(ARCHIVE_CASES))
def test_gedzip_archives_are_checked_before_reading(case: ContractCase) -> None:
    with pytest.raises(InvalidInput) as raised:
        GedcomReader().read(_zip(case["input_overrides"]["members"]))
    assert {"code": raised.value.code, "message": raised.value.message} == case["expected_overrides"]


def test_gedzip_that_unpacks_beyond_two_hundred_megabytes_is_rejected() -> None:
    archive = gedzip_bytes(gedcom_bytes(HEADER, "0 TRLR"), {"media/anne.jpg": jpeg_bytes()})
    with pytest.raises(InvalidInput) as raised:
        GedcomReader().read(_declaring_unpacked_size(archive, 201 * MEGABYTE))
    expected = ("gedcom.too_large", "The GEDZIP file unpacks to more than 200 MB.")
    assert (raised.value.code, raised.value.message) == expected


def test_truncated_gedzip_is_reported_as_damaged() -> None:
    archive = gedzip_bytes(gedcom_bytes(HEADER, "0 TRLR"), {"media/anne.jpg": jpeg_bytes()})
    with pytest.raises(InvalidInput) as raised:
        GedcomReader().read(archive[: len(archive) // 2])
    assert (raised.value.code, raised.value.message) == ("gedcom.unreadable", DAMAGED)


def test_gedzip_with_a_corrupted_member_is_reported_as_damaged() -> None:
    gedcom = gedcom_bytes(HEADER, "0 @I1@ INDI", "1 NAME Anne /Darwin/", "0 TRLR")
    archive = _zip({"gedcom.ged": gedcom}, zipfile.ZIP_STORED)
    with pytest.raises(InvalidInput) as raised:
        GedcomReader().read(archive.replace(b"Anne", b"Emma"))
    assert (raised.value.code, raised.value.message) == ("gedcom.unreadable", DAMAGED)


def test_media_that_no_photo_link_uses_are_never_read() -> None:
    gedcom = gedcom_bytes(
        HEADER, "0 @I1@ INDI", "1 NAME Anne /Darwin/", "1 OBJE", "2 FILE media/anne.png", "0 TRLR"
    )
    archive = _stored({"gedcom.ged": gedcom, "media/anne.png": png_bytes(), "media/unused.jpg": UNUSED_PHOTO})
    document = GedcomReader().read(_corrupted(archive, UNUSED_PHOTO))
    assert (document.people[0].photo, document.skipped) == (Photo(PhotoType.PNG, png_bytes()), ())


def test_photo_declared_over_two_megabytes_is_skipped_without_being_read() -> None:
    oversized = jpeg_bytes() + UNUSED_PHOTO * (2 * MEGABYTE // len(UNUSED_PHOTO) + 1)
    gedcom = gedcom_bytes(
        HEADER, "0 @I1@ INDI", "1 NAME Anne /Darwin/", "1 OBJE", "2 FILE media/large.jpg", "0 TRLR"
    )
    archive = _stored({"gedcom.ged": gedcom, "media/large.jpg": oversized})
    document = GedcomReader().read(_corrupted(archive, UNUSED_PHOTO))
    reason = "'media/large.jpg' is larger than 2 MB, so the photo is skipped."
    assert [(record.location, record.reason) for record in document.skipped] == [("@I1@ OBJE", reason)]


def test_photos_that_add_up_beyond_sixty_megabytes_are_rejected_before_reading() -> None:
    photo = jpeg_bytes() + b"\x00" * (2 * MEGABYTE - len(jpeg_bytes()))
    people = [f"0 @I{number}@ INDI\n1 OBJE\n2 FILE media/{number}.jpg" for number in range(1, 31)]
    gedcom = gedcom_bytes(HEADER, *people, "0 TRLR")
    archive = gedzip_bytes(gedcom, {f"media/{number}.jpg": photo for number in range(1, 31)})
    with pytest.raises(InvalidInput) as raised:
        GedcomReader().read(archive)
    expected = (
        "gedcom.too_large",
        "The family tree and photos in the GEDZIP file add up to more than 60 MB.",
    )
    assert (raised.value.code, raised.value.message) == expected


def test_gedcom_file_over_twenty_megabytes_inside_a_gedzip_is_rejected() -> None:
    gedcom = gedcom_bytes(HEADER, "1 NOTE " + "x" * (20 * MEGABYTE), "0 TRLR")
    with pytest.raises(InvalidInput) as raised:
        GedcomReader().read(gedzip_bytes(gedcom, {}))
    expected = ("gedcom.too_large", "The gedcom.ged in the GEDZIP file is larger than 20 MB.")
    assert (raised.value.code, raised.value.message) == expected


def _corrupted(archive: bytes, content: bytes) -> bytes:
    corrupted = archive.replace(content, content[::-1])
    assert corrupted != archive
    return corrupted


def _stored(members: dict[str, bytes]) -> bytes:
    return _zip(members, zipfile.ZIP_STORED)


def _zip(members: dict[str, bytes], compression: int = zipfile.ZIP_DEFLATED) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=compression) as archive:
        for name, content in members.items():
            archive.writestr(name, content)
    return buffer.getvalue()


def _declaring_unpacked_size(archive: bytes, size: int) -> bytes:
    size_field = archive.rindex(b"PK\x01\x02") + 24
    return archive[:size_field] + struct.pack("<I", size) + archive[size_field + 4 :]
