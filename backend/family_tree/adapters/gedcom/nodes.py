import re
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from enum import StrEnum
from functools import partial
from operator import methodcaller

from family_tree.adapters.gedcom.lines import GedcomLine

VOID_POINTER = "@VOID@"
_POINTER = re.compile(r"@[^@#\s][^@]*@")
_LEADING_DOUBLE_AT_SIGN = re.compile(r"^@@")


class GedcomVersion(StrEnum):
    GEDCOM_551 = "5.5.1"
    GEDCOM_7 = "7.0"


@dataclass(frozen=True, slots=True, kw_only=True)
class GedcomNode:
    line_number: int
    xref: str | None
    tag: str
    value: str
    pointer: str | None
    children: tuple["GedcomNode", ...]

    def first_child(self, tag: str) -> "GedcomNode | None":
        return next((child for child in self.children if child.tag == tag), None)

    def children_tagged(self, *tags: str) -> tuple["GedcomNode", ...]:
        return tuple(child for child in self.children if child.tag in tags)

    def child_text(self, tag: str) -> str:
        child = self.first_child(tag)
        return "" if child is None else child.value

    def reference(self) -> str:
        return self.xref or f"Line {self.line_number}"


@dataclass(frozen=True, slots=True, kw_only=True)
class GedcomFile:
    version: GedcomVersion
    records: tuple[GedcomNode, ...]
    records_by_xref: Mapping[str, GedcomNode]

    def distinct_records(self, tag: str) -> tuple[GedcomNode, ...]:
        return tuple(
            record for record in self.records if record.tag == tag and self._is_first_with_its_xref(record)
        )

    def repeated_records(self, tag: str) -> tuple[GedcomNode, ...]:
        return tuple(
            record
            for record in self.records
            if record.tag == tag and not self._is_first_with_its_xref(record)
        )

    def resolve(self, pointer: str, *tags: str) -> GedcomNode | None:
        record = self.records_by_xref.get(pointer)
        return record if record is not None and record.tag in tags else None

    def _is_first_with_its_xref(self, record: GedcomNode) -> bool:
        return record.xref is None or self.records_by_xref.get(record.xref) is record


@dataclass(frozen=True, slots=True, kw_only=True)
class _TextRules:
    continuation_tags: frozenset[str]
    unescape: Callable[[str], str]


_RULES_BY_VERSION = {
    GedcomVersion.GEDCOM_551: _TextRules(
        continuation_tags=frozenset({"CONC", "CONT"}), unescape=methodcaller("replace", "@@", "@")
    ),
    GedcomVersion.GEDCOM_7: _TextRules(
        continuation_tags=frozenset({"CONT"}), unescape=partial(_LEADING_DOUBLE_AT_SIGN.sub, "@")
    ),
}


def build_gedcom_file(lines: Sequence[GedcomLine]) -> GedcomFile:
    version = _version_of(lines)
    records, _ = _build_nodes(lines, 0, 0, _RULES_BY_VERSION[version])
    records_by_xref = {record.xref: record for record in reversed(records) if record.xref is not None}
    return GedcomFile(version=version, records=records, records_by_xref=records_by_xref)


def _version_of(lines: Sequence[GedcomLine]) -> GedcomVersion:
    header_end = next(
        (index for index, line in enumerate(lines) if index > 0 and line.level == 0), len(lines)
    )
    header_nodes, _ = _build_nodes(lines[:header_end], 0, 0, _RULES_BY_VERSION[GedcomVersion.GEDCOM_551])
    gedcom_form = header_nodes[0].first_child("GEDC")
    declared = "" if gedcom_form is None else gedcom_form.child_text("VERS").strip()
    return GedcomVersion.GEDCOM_7 if declared.startswith("7") else GedcomVersion.GEDCOM_551


def _build_nodes(
    lines: Sequence[GedcomLine], start: int, level: int, rules: _TextRules
) -> tuple[tuple[GedcomNode, ...], int]:
    nodes: list[GedcomNode] = []
    index = start
    while index < len(lines) and lines[index].level == level:
        children, index_after_children = _build_nodes(lines, index + 1, level + 1, rules)
        nodes.append(_node(lines[index], children, rules))
        index = index_after_children
    return tuple(nodes), index


def _node(line: GedcomLine, children: tuple[GedcomNode, ...], rules: _TextRules) -> GedcomNode:
    continuations = [child for child in children if child.tag in rules.continuation_tags]
    return GedcomNode(
        line_number=line.number,
        xref=line.xref,
        tag=line.tag,
        value=rules.unescape(line.value) + "".join(map(_continued_text, continuations)),
        pointer=line.value if _POINTER.fullmatch(line.value) else None,
        children=tuple(child for child in children if child.tag not in rules.continuation_tags),
    )


def _continued_text(continuation: GedcomNode) -> str:
    return ("\n" if continuation.tag == "CONT" else "") + continuation.value
