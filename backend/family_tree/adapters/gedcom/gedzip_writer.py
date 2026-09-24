import io
import zipfile
from collections.abc import Mapping, Sequence
from dataclasses import dataclass

from family_tree.adapters.gedcom.archive import GEDZIP_GEDCOM_NAME
from family_tree.adapters.gedcom.export_records import MediaFile
from family_tree.adapters.gedcom.gedcom7_writer import GEDCOM_7_DIALECT
from family_tree.adapters.gedcom.rendering import render_gedcom
from family_tree.domain.enums import PhotoType
from family_tree.domain.identifiers import PersonId
from family_tree.domain.interchange import TreeSnapshot

_EXTENSIONS = {PhotoType.JPEG: "jpg", PhotoType.PNG: "png", PhotoType.WEBP: "webp"}
_FIXED_TIMESTAMP = (1980, 1, 1, 0, 0, 0)
_UNIX_SYSTEM = 3
_READABLE_FILE_MODE = 0o644 << 16


@dataclass(frozen=True, slots=True, kw_only=True)
class _ArchiveMember:
    name: str
    content: bytes
    compression: int


class GedzipWriter:
    def write(self, snapshot: TreeSnapshot) -> bytes:
        media_files = _media_files(snapshot)
        gedcom = render_gedcom(snapshot, GEDCOM_7_DIALECT, media_files)
        photos = [
            _ArchiveMember(
                name=media_files[person_id].path,
                content=snapshot.photos[person_id].content,
                compression=zipfile.ZIP_STORED,
            )
            for person_id in sorted(media_files)
        ]
        gedcom_member = _ArchiveMember(
            name=GEDZIP_GEDCOM_NAME, content=gedcom, compression=zipfile.ZIP_DEFLATED
        )
        return _zip_archive([gedcom_member, *photos])


def _media_files(snapshot: TreeSnapshot) -> Mapping[PersonId, MediaFile]:
    people = {person.id for person in snapshot.people}
    return {
        person_id: MediaFile(
            person_id=person_id,
            path=f"media/I{person_id}.{_EXTENSIONS[photo.media_type]}",
            media_type=photo.media_type,
        )
        for person_id, photo in snapshot.photos.items()
        if person_id in people
    }


def _zip_archive(members: Sequence[_ArchiveMember]) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        for member in members:
            archive.writestr(_entry(member), member.content, compress_type=member.compression)
    return buffer.getvalue()


def _entry(member: _ArchiveMember) -> zipfile.ZipInfo:
    entry = zipfile.ZipInfo(member.name, date_time=_FIXED_TIMESTAMP)
    entry.create_system = _UNIX_SYSTEM
    entry.external_attr = _READABLE_FILE_MODE
    return entry
