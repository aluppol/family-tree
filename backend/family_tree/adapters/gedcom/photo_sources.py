from collections.abc import Mapping
from dataclasses import dataclass
from typing import Protocol, override
from urllib.parse import unquote

from family_tree.adapters.gedcom.mapped import Mapped, broken_reference, skipped_at
from family_tree.adapters.gedcom.nodes import VOID_POINTER, GedcomFile, GedcomNode
from family_tree.domain.errors import InvalidInput
from family_tree.domain.photos import Photo, photo_from_bytes


class PhotoSource(Protocol):
    def photo_of(self, individual: GedcomNode, gedcom: GedcomFile) -> Mapped[Photo | None]: ...


class NoPhotoSource(PhotoSource):
    @override
    def photo_of(self, individual: GedcomNode, gedcom: GedcomFile) -> Mapped[Photo | None]:
        return Mapped(None)


@dataclass(frozen=True, slots=True)
class ArchivePhotoSource(PhotoSource):
    media: Mapping[str, bytes]

    @override
    def photo_of(self, individual: GedcomNode, gedcom: GedcomFile) -> Mapped[Photo | None]:
        location = f"{individual.reference()} OBJE"
        links = [_linked_files(link, gedcom, location) for link in individual.children_tagged("OBJE")]
        photo = self._first_archived_photo([path for link in links for path in link.value], location)
        return Mapped(photo.value, (*(record for link in links for record in link.skipped), *photo.skipped))

    def _first_archived_photo(self, file_paths: list[str], location: str) -> Mapped[Photo | None]:
        archived = next((path for path in file_paths if _member_name(path) in self.media), None)
        if archived is not None:
            return _decoded_photo(self.media[_member_name(archived)], archived, location)
        if file_paths:
            reason = f"'{file_paths[0]}' is not in the GEDZIP file, so the photo is skipped."
            return Mapped(None, skipped_at(location, reason))
        return Mapped(None)


def _linked_files(link: GedcomNode, gedcom: GedcomFile, location: str) -> Mapped[tuple[str, ...]]:
    if link.pointer is None:
        return Mapped(_file_paths(link))
    if link.pointer == VOID_POINTER:
        return Mapped(())
    media_record = gedcom.resolve(link.pointer, "OBJE")
    if media_record is None:
        return Mapped((), broken_reference(location, link.pointer, "media record"))
    return Mapped(_file_paths(media_record))


def _file_paths(media: GedcomNode) -> tuple[str, ...]:
    return tuple(path for path in (file.value.strip() for file in media.children_tagged("FILE")) if path)


def _member_name(file_path: str) -> str:
    return unquote(file_path).removeprefix("./")


def _decoded_photo(content: bytes, file_path: str, location: str) -> Mapped[Photo | None]:
    try:
        photo = photo_from_bytes(content)
    except InvalidInput as error:
        return Mapped(None, skipped_at(location, f"'{file_path}' is not imported. {error.message}"))
    return Mapped(photo)
