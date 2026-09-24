import base64
import io
import struct
import zipfile
import zlib
from collections.abc import Mapping, Sequence

from family_tree.domain.dates import CalendarDate, GenealogicalDate
from family_tree.domain.enums import DateQualifier, ParentLinkKind, PartnershipKind, Sex
from family_tree.domain.identifiers import ParentLinkId, PartnershipId, PersonId, TreeId
from family_tree.domain.interchange import TreeSnapshot
from family_tree.domain.people import LifeEvent, Person, PersonProfile
from family_tree.domain.photos import Photo
from family_tree.domain.relationships import ParentLink, Partnership, PartnershipEnd, PartnershipTerms

TREE_ID = TreeId(1)
_JPEG_SEGMENTS = (
    (0xE0, b"JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00"),
    (0xDB, b"\x00" + b"\x01" * 64),
    (0xC0, b"\x08\x00\x01\x00\x01\x01\x01\x11\x00"),
    (0xC4, b"\x00\x01" + b"\x00" * 15 + b"\x00"),
    (0xC4, b"\x10\x01" + b"\x00" * 15 + b"\x00"),
    (0xDA, b"\x01\x01\x00\x00\x3f\x00"),
)
_WEBP_ONE_PIXEL = "UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA=="


def exact(year: int, month: int | None = None, day: int | None = None) -> GenealogicalDate:
    return GenealogicalDate(DateQualifier.EXACT, CalendarDate(year, month, day))


def qualified(
    qualifier: DateQualifier, year: int, month: int | None = None, day: int | None = None
) -> GenealogicalDate:
    return GenealogicalDate(qualifier, CalendarDate(year, month, day))


def between(first_year: int, last_year: int) -> GenealogicalDate:
    return GenealogicalDate(DateQualifier.BETWEEN, CalendarDate(first_year), CalendarDate(last_year))


def profile(
    given_names: str,
    surname: str,
    sex: Sex = Sex.UNKNOWN,
    birth: LifeEvent | None = None,
    death: LifeEvent | None = None,
    biography: str = "",
) -> PersonProfile:
    return PersonProfile(
        given_names=given_names,
        surname=surname,
        sex=sex,
        birth=birth or LifeEvent(),
        death=death,
        biography=biography,
    )


def person(person_id: int, person_profile: PersonProfile) -> Person:
    return Person(id=PersonId(person_id), tree_id=TREE_ID, profile=person_profile)


def parent_link(link_id: int, parent_id: int, child_id: int, kind: ParentLinkKind) -> ParentLink:
    return ParentLink(
        id=ParentLinkId(link_id),
        tree_id=TREE_ID,
        parent_id=PersonId(parent_id),
        child_id=PersonId(child_id),
        kind=kind,
    )


def partnership(partnership_id: int, first_id: int, second_id: int, terms: PartnershipTerms) -> Partnership:
    return Partnership(
        id=PartnershipId(partnership_id),
        tree_id=TREE_ID,
        first_partner_id=PersonId(first_id),
        second_partner_id=PersonId(second_id),
        terms=terms,
    )


def terms(
    kind: PartnershipKind, start: LifeEvent | None = None, end: PartnershipEnd | None = None
) -> PartnershipTerms:
    return PartnershipTerms(kind=kind, start=start or LifeEvent(), end=end)


def snapshot(
    people: Sequence[Person],
    parent_links: Sequence[ParentLink] = (),
    partnerships: Sequence[Partnership] = (),
    photos: Mapping[int, Photo] | None = None,
) -> TreeSnapshot:
    return TreeSnapshot(
        people=tuple(people),
        parent_links=tuple(parent_links),
        partnerships=tuple(partnerships),
        photos={PersonId(person_id): photo for person_id, photo in (photos or {}).items()},
    )


def gedcom_bytes(*records: str) -> bytes:
    return "".join(f"{record}\n" for record in records).encode("utf-8")


def gedzip_bytes(gedcom: bytes, media: Mapping[str, bytes]) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("gedcom.ged", gedcom)
        for name, content in media.items():
            archive.writestr(name, content)
    return buffer.getvalue()


def jpeg_bytes() -> bytes:
    segments = b"".join(
        bytes([0xFF, marker]) + struct.pack(">H", len(payload) + 2) + payload
        for marker, payload in _JPEG_SEGMENTS
    )
    return b"\xff\xd8" + segments + b"\x3f\xff\xd9"


def png_bytes() -> bytes:
    header = struct.pack(">IIBBBBB", 1, 1, 8, 0, 0, 0, 0)
    chunks = ((b"IHDR", header), (b"IDAT", zlib.compress(b"\x00\x80")), (b"IEND", b""))
    return b"\x89PNG\r\n\x1a\n" + b"".join(_png_chunk(kind, payload) for kind, payload in chunks)


def webp_bytes() -> bytes:
    return base64.b64decode(_WEBP_ONE_PIXEL)


def _png_chunk(kind: bytes, payload: bytes) -> bytes:
    return struct.pack(">I", len(payload)) + kind + payload + struct.pack(">I", zlib.crc32(kind + payload))
