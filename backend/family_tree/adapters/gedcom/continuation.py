import re
from collections.abc import Callable

type TextLines = Callable[[str, int, str], list[str]]

MAX_LINE_LENGTH = 255
LINE_TERMINATOR = "\n"
_MAX_CONTENT_LENGTH = MAX_LINE_LENGTH - len(LINE_TERMINATOR)
_LINE_BREAK = re.compile(r"\r\n|\r|\n")


def gedcom551_text_lines(head: str, continuation_level: int, text: str) -> list[str]:
    first, *others = _LINE_BREAK.split(text)
    continued = f"{continuation_level} CONT"
    return [
        *_concatenated(head, continuation_level, first),
        *(line for other in others for line in _concatenated(continued, continuation_level, other)),
    ]


def gedcom7_text_lines(head: str, continuation_level: int, text: str) -> list[str]:
    first, *others = _LINE_BREAK.split(text)
    continued = f"{continuation_level} CONT"
    return [
        _line(head, _escape_leading_at_sign(first)),
        *(_line(continued, _escape_leading_at_sign(other)) for other in others),
    ]


def _concatenated(head: str, continuation_level: int, segment: str) -> list[str]:
    concatenated = f"{continuation_level} CONC"
    first_width = _MAX_CONTENT_LENGTH - len(head) - 1
    next_width = _MAX_CONTENT_LENGTH - len(concatenated) - 1
    first, *others = _chunks(segment.replace("@", "@@"), first_width, next_width)
    return [_line(head, first), *(_line(concatenated, other) for other in others)]


def _chunks(text: str, first_width: int, next_width: int) -> list[str]:
    chunks: list[str] = []
    remaining, width = text, first_width
    while len(remaining) > width:
        cut = _safe_cut(remaining, width)
        chunks.append(remaining[:cut])
        remaining, width = remaining[cut:], next_width
    return [*chunks, remaining]


def _safe_cut(text: str, width: int) -> int:
    return next((cut for cut in range(width, 0, -1) if _is_safe_cut(text, cut)), width)


def _is_safe_cut(text: str, cut: int) -> bool:
    before, after = text[cut - 1], text[cut]
    return " " not in (before, after) and not before == after == "@"


def _escape_leading_at_sign(text: str) -> str:
    return f"@{text}" if text.startswith("@") else text


def _line(head: str, payload: str) -> str:
    return f"{head} {payload}" if payload else head
