from collections.abc import Mapping
from dataclasses import dataclass

VOID_POINTER = "@VOID@"


@dataclass(frozen=True, slots=True, kw_only=True)
class GedcomNode:
    line_number: int
    xref: str | None
    tag: str
    value: str
    pointer: str | None
    children: tuple["GedcomNode", ...]

    def first_child(self, tag: str) -> "GedcomNode | None":
        for child in self.children:
            if child.tag == tag:
                return child
        return None

    def children_tagged(self, *tags: str) -> tuple["GedcomNode", ...]:
        return tuple(child for child in self.children if child.tag in tags)

    def child_text(self, tag: str) -> str:
        child = self.first_child(tag)
        return "" if child is None else child.value

    def reference(self) -> str:
        return self.xref or f"Line {self.line_number}"


@dataclass(frozen=True, slots=True, kw_only=True)
class GedcomFile:
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
