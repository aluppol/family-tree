from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import Protocol, override
from urllib.parse import unquote

from family_tree.adapters.gedcom.archive import GedzipArchive
from family_tree.adapters.gedcom.limits import MEGABYTE
from family_tree.adapters.gedcom.mapped import Mapped, broken_reference, skipped_at
from family_tree.adapters.gedcom.nodes import VOID_POINTER, GedcomFile, GedcomNode
from family_tree.domain.errors import InvalidInput
from family_tree.domain.photos import MAX_PHOTO_BYTES, Photo, photo_from_bytes


class PhotoSource(Protocol):
    def photo_of(self, individual: GedcomNode) -> Mapped[Photo | None]: ...


class NoPhotoSource(PhotoSource):
    @override
    def photo_of(self, individual: GedcomNode) -> Mapped[Photo | None]:
        return Mapped(None)


@dataclass(frozen=True, slots=True, kw_only=True)
class ChosenFile:
    file_path: str
    member: str
    size: int


@dataclass(frozen=True, slots=True, kw_only=True)
class ArchivePhotoSource(PhotoSource):
    choices: Mapping[str, Mapped[ChosenFile | None]]
    contents: Mapping[str, bytes]

    @override
    def photo_of(self, individual: GedcomNode) -> Mapped[Photo | None]:
        choice = self.choices[individual.reference()]
        photo = self._photo(choice.value, f"{individual.reference()} OBJE")
        return Mapped(photo.value, (*choice.skipped, *photo.skipped))

    def _photo(self, chosen: ChosenFile | None, location: str) -> Mapped[Photo | None]:
        if chosen is None:
            return Mapped(None)
        if chosen.size > MAX_PHOTO_BYTES:
            limit = MAX_PHOTO_BYTES // MEGABYTE
            reason = f"'{chosen.file_path}' is larger than {limit} MB, so the photo is skipped."
            return Mapped(None, skipped_at(location, reason))
        return _decoded_photo(self.contents[chosen.member], chosen.file_path, location)


def archive_photo_source(archive: GedzipArchive, gedcom: GedcomFile) -> ArchivePhotoSource:
    choices = {
        individual.reference(): _chosen_file(individual, gedcom, archive.member_sizes)
        for individual in gedcom.distinct_records("INDI")
    }
    wanted = {
        choice.value.member
        for choice in choices.values()
        if choice.value is not None and choice.value.size <= MAX_PHOTO_BYTES
    }
    return ArchivePhotoSource(choices=choices, contents=archive.read_members(wanted))


def _chosen_file(
    individual: GedcomNode, gedcom: GedcomFile, member_sizes: Mapping[str, int]
) -> Mapped[ChosenFile | None]:
    location = f"{individual.reference()} OBJE"
    links = [_linked_files(link, gedcom, location) for link in individual.children_tagged("OBJE")]
    chosen = _first_archived([path for link in links for path in link.value], member_sizes, location)
    return Mapped(chosen.value, (*(record for link in links for record in link.skipped), *chosen.skipped))


def _first_archived(
    file_paths: Sequence[str], member_sizes: Mapping[str, int], location: str
) -> Mapped[ChosenFile | None]:
    archived = next((path for path in file_paths if _member_name(path) in member_sizes), None)
    if archived is not None:
        member = _member_name(archived)
        return Mapped(ChosenFile(file_path=archived, member=member, size=member_sizes[member]))
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
