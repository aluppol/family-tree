import io
import re
import zipfile
import zlib
from collections.abc import Callable, Collection, Mapping, Sequence
from dataclasses import dataclass
from pathlib import PurePosixPath

from family_tree.adapters.gedcom.errors import too_large, unreadable
from family_tree.adapters.gedcom.limits import (
    MAX_ARCHIVE_BYTES,
    MAX_ARCHIVE_READ_BYTES,
    MAX_PAYLOAD_BYTES,
    MEGABYTE,
)

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
class GedzipArchive:
    payload: bytes
    gedcom: bytes
    member_sizes: Mapping[str, int]

    def read_members(self, names: Collection[str]) -> Mapping[str, bytes]:
        unpacked = len(self.gedcom) + sum(self.member_sizes[name] for name in names)
        if unpacked > MAX_ARCHIVE_READ_BYTES:
            limit = MAX_ARCHIVE_READ_BYTES // MEGABYTE
            raise too_large(f"The family tree and photos in the GEDZIP file add up to more than {limit} MB.")
        return _guarded(_read_members, self.payload, sorted(names))


def is_gedzip(payload: bytes) -> bool:
    return payload.startswith(_ZIP_SIGNATURES)


def open_gedzip(payload: bytes) -> GedzipArchive:
    members = _guarded(_file_members, payload)
    _require_safe_paths(members)
    _require_unpacked_size_within_limit(members)
    member_sizes = {member.filename: member.file_size for member in members}
    _require_gedcom_member(member_sizes)
    gedcom = _guarded(_read_members, payload, [GEDZIP_GEDCOM_NAME])[GEDZIP_GEDCOM_NAME]
    media_sizes = {name: size for name, size in member_sizes.items() if name != GEDZIP_GEDCOM_NAME}
    return GedzipArchive(payload=payload, gedcom=gedcom, member_sizes=media_sizes)


def _guarded[**P, T](unzip: Callable[P, T], *arguments: P.args, **keywords: P.kwargs) -> T:
    try:
        unzipped = unzip(*arguments, **keywords)
    except _ARCHIVE_ERRORS as error:
        raise unreadable("The GEDZIP file is damaged or uses an unsupported zip feature.") from error
    return unzipped


def _file_members(payload: bytes) -> list[zipfile.ZipInfo]:
    with zipfile.ZipFile(io.BytesIO(payload)) as archive:
        return [member for member in archive.infolist() if not member.is_dir()]


def _read_members(payload: bytes, names: Sequence[str]) -> dict[str, bytes]:
    with zipfile.ZipFile(io.BytesIO(payload)) as archive:
        return {name: archive.read(name) for name in names}


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


def _require_gedcom_member(sizes: Mapping[str, int]) -> None:
    if GEDZIP_GEDCOM_NAME not in sizes:
        raise unreadable(f"The GEDZIP file has no {GEDZIP_GEDCOM_NAME}.")
    if sizes[GEDZIP_GEDCOM_NAME] > MAX_PAYLOAD_BYTES:
        limit = MAX_PAYLOAD_BYTES // MEGABYTE
        raise too_large(f"The {GEDZIP_GEDCOM_NAME} in the GEDZIP file is larger than {limit} MB.")
