import re
from collections import defaultdict
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from enum import StrEnum
from operator import methodcaller

from family_tree.adapters.gedcom.lines import GedcomLine
from family_tree.adapters.gedcom.nodes import GedcomFile, GedcomNode

_POINTER = re.compile(r"@[^@#\s][^@]*@")


class GedcomVersion(StrEnum):
    GEDCOM_551 = "5.5.1"
    GEDCOM_7 = "7.0"


@dataclass(frozen=True, slots=True, kw_only=True)
class _TextRules:
    continuation_tags: frozenset[str]
    unescape: Callable[[str], str]


def build_gedcom_file(lines: Sequence[GedcomLine]) -> GedcomFile:
    records = _build_records(lines, _RULES_BY_VERSION[_version_of(lines)])
    records_by_xref = {record.xref: record for record in reversed(records) if record.xref is not None}
    return GedcomFile(records=records, records_by_xref=records_by_xref)


def _version_of(lines: Sequence[GedcomLine]) -> GedcomVersion:
    header_end = next(
        (index for index, line in enumerate(lines) if index > 0 and line.level == 0), len(lines)
    )
    header = _build_records(lines[:header_end], _RULES_BY_VERSION[GedcomVersion.GEDCOM_551])[0]
    gedcom_form = header.first_child("GEDC")
    declared = "" if gedcom_form is None else gedcom_form.child_text("VERS").strip()
    return GedcomVersion.GEDCOM_7 if declared.startswith("7") else GedcomVersion.GEDCOM_551


def _build_records(lines: Sequence[GedcomLine], rules: _TextRules) -> tuple[GedcomNode, ...]:
    completed_by_level: defaultdict[int, list[GedcomNode]] = defaultdict(list)
    for line in reversed(lines):
        children = completed_by_level[line.level + 1]
        completed_by_level[line.level].append(_node(line, tuple(reversed(children)), rules))
        children.clear()
    return tuple(reversed(completed_by_level[0]))


def _node(line: GedcomLine, children: tuple[GedcomNode, ...], rules: _TextRules) -> GedcomNode:
    if not children:
        return _leaf(line, rules)
    continued = "".join(_continued_text(child) for child in children if child.tag in rules.continuation_tags)
    return GedcomNode(
        line_number=line.number,
        xref=line.xref,
        tag=line.tag,
        value=rules.unescape(line.value) + continued,
        pointer=_pointer_in(line.value),
        children=tuple(child for child in children if child.tag not in rules.continuation_tags),
    )


def _leaf(line: GedcomLine, rules: _TextRules) -> GedcomNode:
    return GedcomNode(
        line_number=line.number,
        xref=line.xref,
        tag=line.tag,
        value=rules.unescape(line.value),
        pointer=_pointer_in(line.value),
        children=(),
    )


def _pointer_in(value: str) -> str | None:
    return value if value.startswith("@") and _POINTER.fullmatch(value) is not None else None


def _continued_text(continuation: GedcomNode) -> str:
    return ("\n" if continuation.tag == "CONT" else "") + continuation.value


def _unescape_leading_at_sign(value: str) -> str:
    return value[1:] if value.startswith("@@") else value


_RULES_BY_VERSION = {
    GedcomVersion.GEDCOM_551: _TextRules(
        continuation_tags=frozenset({"CONC", "CONT"}), unescape=methodcaller("replace", "@@", "@")
    ),
    GedcomVersion.GEDCOM_7: _TextRules(
        continuation_tags=frozenset({"CONT"}), unescape=_unescape_leading_at_sign
    ),
}
