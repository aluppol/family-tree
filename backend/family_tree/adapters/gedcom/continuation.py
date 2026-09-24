import re
from collections.abc import Callable

type TextLines = Callable[[str, int, str], list[str]]

MAX_LINE_LENGTH = 255
LINE_TERMINATOR = "\n"
_MAX_CONTENT_LENGTH = MAX_LINE_LENGTH - len(LINE_TERMINATOR)
_LINE_BREAK = re.compile(r"\r\n|\r|\n")


def gedcom551_text_lines(head: str, continuation_level: int, text: str) -> list[str]:
    first, *others = _segments(text)
    continued = f"{continuation_level} CONT"
    return [
        *_concatenated(head, continuation_level, first),
        *(line for other in others for line in _concatenated(continued, continuation_level, other)),
    ]


def gedcom7_text_lines(head: str, continuation_level: int, text: str) -> list[str]:
    first, *others = _segments(text)
    continued = f"{continuation_level} CONT"
    return [
        _line(head, _escape_leading_at_sign(first)),
        *(_line(continued, _escape_leading_at_sign(other)) for other in others),
    ]


def _segments(text: str) -> list[str]:
    return _LINE_BREAK.split(text) if "\n" in text or "\r" in text else [text]


def _concatenated(head: str, continuation_level: int, segment: str) -> list[str]:
    escaped = segment.replace("@", "@@")
    if len(head) + len(escaped) < _MAX_CONTENT_LENGTH:
        return [_line(head, escaped)]
    concatenated = f"{continuation_level} CONC"
    first, *others = _chunks(
        escaped, _MAX_CONTENT_LENGTH - len(head) - 1, _MAX_CONTENT_LENGTH - len(concatenated) - 1
    )
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
    clean_cut = next((cut for cut in range(width, 0, -1) if _is_clean_cut(text, cut)), None)
    return clean_cut if clean_cut is not None else _escape_preserving_cut(text, width)


def _is_clean_cut(text: str, cut: int) -> bool:
    return " " not in (text[cut - 1], text[cut]) and not _splits_escaped_at_sign(text, cut)


def _escape_preserving_cut(text: str, width: int) -> int:
    return width - 1 if _splits_escaped_at_sign(text, width) else width


def _splits_escaped_at_sign(text: str, cut: int) -> bool:
    if text[cut - 1] != "@":
        return False
    before = text[:cut]
    return (len(before) - len(before.rstrip("@"))) % 2 == 1


def _escape_leading_at_sign(text: str) -> str:
    return f"@{text}" if text.startswith("@") else text


def _line(head: str, payload: str) -> str:
    return f"{head} {payload}" if payload else head
