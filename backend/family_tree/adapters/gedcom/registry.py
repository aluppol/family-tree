from collections.abc import Callable, Mapping

from family_tree.adapters.gedcom.gedcom7_writer import Gedcom7Writer
from family_tree.adapters.gedcom.gedcom551_writer import Gedcom551Writer
from family_tree.adapters.gedcom.gedzip_writer import GedzipWriter
from family_tree.domain.enums import InterchangeFormat
from family_tree.domain.errors import InvalidInput
from family_tree.domain.ports import InterchangeWriter

_WRITERS: Mapping[InterchangeFormat, Callable[[], InterchangeWriter]] = {
    InterchangeFormat.GEDCOM_551: Gedcom551Writer,
    InterchangeFormat.GEDCOM_7: Gedcom7Writer,
    InterchangeFormat.GEDZIP: GedzipWriter,
}


def writer_for(interchange_format: InterchangeFormat) -> InterchangeWriter:
    create_writer = _WRITERS.get(interchange_format)
    if create_writer is None:
        raise InvalidInput(
            "gedcom.unknown_format", f"Family trees cannot be exported as '{interchange_format}'."
        )
    return create_writer()
