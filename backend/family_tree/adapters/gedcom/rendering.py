from collections.abc import Iterator, Mapping

from family_tree.adapters.gedcom.continuation import LINE_TERMINATOR, TextLines
from family_tree.adapters.gedcom.export_dialect import ExportDialect
from family_tree.adapters.gedcom.export_records import MediaFile, export_records
from family_tree.adapters.gedcom.structures import Structure
from family_tree.domain.identifiers import PersonId
from family_tree.domain.interchange import TreeSnapshot


def render_gedcom(
    snapshot: TreeSnapshot, dialect: ExportDialect, media_files: Mapping[PersonId, MediaFile]
) -> bytes:
    records = export_records(snapshot, dialect, media_files)
    lines = (line for record in records for line in _structure_lines(record, 0, dialect.text_lines))
    return (dialect.preamble + "".join(f"{line}{LINE_TERMINATOR}" for line in lines)).encode("utf-8")


def _structure_lines(structure: Structure, level: int, text_lines: TextLines) -> Iterator[str]:
    head = " ".join(part for part in (str(level), structure.xref, structure.tag) if part)
    if structure.pointer:
        yield f"{head} {structure.pointer}"
    else:
        yield from text_lines(head, level + 1, structure.text)
    for child in structure.children:
        yield from _structure_lines(child, level + 1, text_lines)
