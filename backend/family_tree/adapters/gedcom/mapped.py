from dataclasses import dataclass

from family_tree.adapters.gedcom.nodes import GedcomNode
from family_tree.domain.interchange import SkippedRecord


@dataclass(frozen=True, slots=True)
class Mapped[T]:
    value: T
    skipped: tuple[SkippedRecord, ...] = ()


def skipped_at(location: str, reason: str) -> tuple[SkippedRecord, ...]:
    return (SkippedRecord(location=location, reason=reason),)


def broken_reference(location: str, pointer: str, record_noun: str) -> tuple[SkippedRecord, ...]:
    return skipped_at(
        location, f"{pointer} does not point to a {record_noun} in this file, so the link is skipped."
    )


def repeated_identifier(record: GedcomNode) -> SkippedRecord:
    reason = f"Line {record.line_number} repeats the identifier {record.xref}, so that record is skipped."
    return SkippedRecord(location=record.reference(), reason=reason)
