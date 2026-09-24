import re
from collections.abc import Sequence
from dataclasses import dataclass
from itertools import pairwise

from family_tree.adapters.gedcom.errors import unreadable

_LINE_BREAK = re.compile(r"\r\n|\r|\n")
_LINE = re.compile(
    r"[ \t]*(?P<level>\d{1,2})[ \t]+(?:(?P<xref>@[^@\s]+@)[ \t]+)?(?P<tag>[A-Za-z0-9_]+)(?: (?P<value>.*))?"
)
_PREVIEW_LENGTH = 40


@dataclass(frozen=True, slots=True, kw_only=True)
class GedcomLine:
    number: int
    level: int
    xref: str | None
    tag: str
    value: str


def parse_lines(text: str) -> tuple[GedcomLine, ...]:
    lines = tuple(
        _parse_line(number, content)
        for number, content in enumerate(_LINE_BREAK.split(text), start=1)
        if content.strip()
    )
    _require_header_first(lines)
    _require_consecutive_levels(lines)
    return lines


def count_lines(text: str) -> int:
    return len(_LINE_BREAK.findall(text)) + 1


def _parse_line(number: int, content: str) -> GedcomLine:
    match = _LINE.fullmatch(content)
    if match is None:
        raise unreadable(f"Line {number} is not a GEDCOM line: '{content[:_PREVIEW_LENGTH]}'.")
    return GedcomLine(
        number=number,
        level=int(match["level"]),
        xref=match["xref"],
        tag=match["tag"].upper(),
        value=match["value"] or "",
    )


def _require_header_first(lines: Sequence[GedcomLine]) -> None:
    if not lines or lines[0].level != 0 or lines[0].tag != "HEAD":
        number = lines[0].number if lines else 1
        raise unreadable(f"Line {number} must be '0 HEAD': a GEDCOM file starts with its header.")


def _require_consecutive_levels(lines: Sequence[GedcomLine]) -> None:
    for previous, current in pairwise(lines):
        if current.level > previous.level + 1:
            raise unreadable(
                f"Line {current.number} jumps from level {previous.level} to level {current.level}."
            )
