import io
import re
import zipfile
import zlib
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from pathlib import PurePosixPath

from family_tree.adapters.gedcom.errors import too_large, unreadable
from family_tree.adapters.gedcom.limits import MAX_ARCHIVE_BYTES, MEGABYTE

GEDZIP_GEDCOM_NAME = "gedcom.ged"
_ZIP_SIGNATURES = (b"PK\x03\x04", b"PK\x05\x06")
_ARCHIVE_ERRORS = (
    zipfile.BadZipFile,
    zipfile.LargeZipFile,
    NotImplementedError,
    RuntimeError,
    EOFError,
    zlib.error,
)
_WINDOWS_DRIVE = re.compile(r"^[A-Za-z]:")


@dataclass(frozen=True, slots=True, kw_only=True)
class GedzipContents:
    gedcom: bytes
    media: Mapping[str, bytes]


def is_gedzip(payload: bytes) -> bool:
    return payload.startswith(_ZIP_SIGNATURES)


def open_gedzip(payload: bytes) -> GedzipContents:
    try:
        contents = _unpack(payload)
    except _ARCHIVE_ERRORS as error:
        raise unreadable("The GEDZIP file is damaged or uses an unsupported zip feature.") from error
    return contents


def _unpack(payload: bytes) -> GedzipContents:
    with zipfile.ZipFile(io.BytesIO(payload)) as archive:
        members = [member for member in archive.infolist() if not member.is_dir()]
        _require_safe_paths(members)
        _require_unpacked_size_within_limit(members)
        names = {member.filename for member in members}
        if GEDZIP_GEDCOM_NAME not in names:
            raise unreadable(f"The GEDZIP file has no {GEDZIP_GEDCOM_NAME}.")
        media = {name: archive.read(name) for name in sorted(names - {GEDZIP_GEDCOM_NAME})}
        return GedzipContents(gedcom=archive.read(GEDZIP_GEDCOM_NAME), media=media)


def _require_safe_paths(members: Sequence[zipfile.ZipInfo]) -> None:
    unsafe = next((member.filename for member in members if not _is_safe_path(member.filename)), None)
    if unsafe is not None:
        raise unreadable(f"The GEDZIP file contains the unsafe path '{unsafe}'.")


def _is_safe_path(name: str) -> bool:
    path = PurePosixPath(name)
    return not (path.is_absolute() or ".." in path.parts or "\\" in name or _WINDOWS_DRIVE.match(name))


def _require_unpacked_size_within_limit(members: Sequence[zipfile.ZipInfo]) -> None:
    if sum(member.file_size for member in members) > MAX_ARCHIVE_BYTES:
        raise too_large(f"The GEDZIP file unpacks to more than {MAX_ARCHIVE_BYTES // MEGABYTE} MB.")
