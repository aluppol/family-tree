from family_tree.adapters.gedcom.archive import is_gedzip, open_gedzip
from family_tree.adapters.gedcom.document import map_document
from family_tree.adapters.gedcom.errors import too_large
from family_tree.adapters.gedcom.limits import MAX_PAYLOAD_BYTES, MEGABYTE
from family_tree.adapters.gedcom.parsing import parse_gedcom
from family_tree.adapters.gedcom.photo_sources import NoPhotoSource, archive_photo_source
from family_tree.adapters.gedcom.schema import GEDZIP_SCHEMA, PLAIN_TEXT_SCHEMA
from family_tree.domain.interchange import InterchangeDocument


class GedcomReader:
    def read(self, payload: bytes) -> InterchangeDocument:
        if len(payload) > MAX_PAYLOAD_BYTES:
            raise too_large(f"The file is larger than {MAX_PAYLOAD_BYTES // MEGABYTE} MB.")
        if is_gedzip(payload):
            return _read_gedzip(payload)
        return map_document(parse_gedcom(payload), NoPhotoSource(), PLAIN_TEXT_SCHEMA)


def _read_gedzip(payload: bytes) -> InterchangeDocument:
    archive = open_gedzip(payload)
    gedcom = parse_gedcom(archive.gedcom)
    return map_document(gedcom, archive_photo_source(archive, gedcom), GEDZIP_SCHEMA)
