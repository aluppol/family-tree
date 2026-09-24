from dataclasses import dataclass

from family_tree.adapters.gedcom.archive import is_gedzip, open_gedzip
from family_tree.adapters.gedcom.errors import too_large
from family_tree.adapters.gedcom.limits import MAX_PAYLOAD_BYTES, MEGABYTE
from family_tree.adapters.gedcom.photo_sources import ArchivePhotoSource, NoPhotoSource, PhotoSource
from family_tree.adapters.gedcom.schema import GEDZIP_SCHEMA, PLAIN_TEXT_SCHEMA
from family_tree.adapters.gedcom.survey import Supported


@dataclass(frozen=True, slots=True, kw_only=True)
class GedcomSource:
    gedcom: bytes
    photos: PhotoSource
    schema: tuple[Supported, ...]


def open_source(payload: bytes) -> GedcomSource:
    if len(payload) > MAX_PAYLOAD_BYTES:
        raise too_large(f"The file is larger than {MAX_PAYLOAD_BYTES // MEGABYTE} MB.")
    if is_gedzip(payload):
        contents = open_gedzip(payload)
        return GedcomSource(
            gedcom=contents.gedcom, photos=ArchivePhotoSource(contents.media), schema=GEDZIP_SCHEMA
        )
    return GedcomSource(gedcom=payload, photos=NoPhotoSource(), schema=PLAIN_TEXT_SCHEMA)
