import re
from collections import Counter
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from itertools import pairwise

BYTE_ORDER_MARK = "\ufeff"
VOID_POINTER = "@VOID@"
_LINE = re.compile(
    r"(?P<level>0|[1-9][0-9]?) (?:(?P<xref>@[A-Z0-9_]+@) )?(?P<tag>_?[A-Z][A-Z0-9_]*)(?: (?P<payload>.+))?"
)
_POINTER = re.compile(r"@[A-Z0-9_]+@")
_CALENDAR_ESCAPE = re.compile(r"@#D[^@]*@")
_RECORD_TAGS = frozenset({"HEAD", "TRLR", "INDI", "FAM", "OBJE", "SUBM", "NOTE", "SNOTE", "SOUR", "REPO"})
_POINTER_ONLY_TAGS = frozenset({"HUSB", "WIFE", "CHIL", "FAMC", "FAMS", "SNOTE"})
_POINTER_TARGETS = {
    "HUSB": "INDI",
    "WIFE": "INDI",
    "CHIL": "INDI",
    "FAMC": "FAM",
    "FAMS": "FAM",
    "OBJE": "OBJE",
    "SUBM": "SUBM",
    "SNOTE": "SNOTE",
}


@dataclass(frozen=True, slots=True)
class ValidationRules:
    version: str
    required_header_paths: frozenset[str]
    forbidden_header_paths: frozenset[str]
    continuation_tags: frozenset[str]
    sex_values: frozenset[str]
    pedigree_values: frozenset[str]
    max_line_length: int | None
    has_unescaped_at_sign: Callable[[str], bool]


@dataclass(frozen=True, slots=True)
class Line:
    number: int
    level: int
    xref: str | None
    tag: str
    payload: str


def gedcom_problems(text: str, rules: ValidationRules) -> list[str]:
    physical_lines = text.removeprefix(BYTE_ORDER_MARK).split("\n")
    malformed = _terminator_problems(text, physical_lines) + _grammar_problems(physical_lines[:-1])
    if malformed:
        return malformed
    lines = [_parsed(number, content) for number, content in enumerate(physical_lines[:-1], start=1)]
    return [
        *_length_problems(physical_lines[:-1], rules),
        *_level_problems(lines),
        *_record_problems(lines),
        *_header_problems(lines, rules),
        *_pointer_problems(lines),
        *_continuation_problems(lines, rules),
        *_enumeration_problems(lines, rules),
        *_escape_problems(lines, rules),
    ]


def _terminator_problems(text: str, physical_lines: Sequence[str]) -> list[str]:
    problems = [] if text.endswith("\n") else ["the last line has no line terminator"]
    problems += ["a carriage return is used as a line terminator"] if "\r" in text else []
    return problems + [
        f"line {number}: empty line" for number, line in enumerate(physical_lines[:-1], 1) if not line
    ]


def _grammar_problems(physical_lines: Sequence[str]) -> list[str]:
    return [
        f"line {number}: not 'level [@XREF@] TAG [payload]': {content!r}"
        for number, content in enumerate(physical_lines, start=1)
        if content and _LINE.fullmatch(content) is None
    ]


def _parsed(number: int, content: str) -> Line:
    match = _LINE.fullmatch(content)
    assert match is not None
    return Line(number, int(match["level"]), match["xref"], match["tag"], match["payload"] or "")


def _length_problems(physical_lines: Sequence[str], rules: ValidationRules) -> list[str]:
    if rules.max_line_length is None:
        return []
    return [
        f"line {number}: {len(content) + 1} characters with its terminator"
        for number, content in enumerate(physical_lines, start=1)
        if len(content) + 1 > rules.max_line_length
    ]


def _level_problems(lines: Sequence[Line]) -> list[str]:
    first = [] if lines and lines[0].level == 0 else ["the first line is not at level 0"]
    return first + [
        f"line {current.number}: level {current.level} follows level {previous.level}"
        for previous, current in pairwise(lines)
        if current.level > previous.level + 1
    ]


def _record_problems(lines: Sequence[Line]) -> list[str]:
    records = [line for line in lines if line.level == 0]
    if not records or records[0].tag != "HEAD" or records[-1].tag != "TRLR":
        return ["records must run from HEAD to TRLR"]
    unknown = [
        f"line {line.number}: {line.tag} is not a record" for line in records if line.tag not in _RECORD_TAGS
    ]
    anonymous = [
        f"line {line.number}: {line.tag} record without xref"
        for line in records
        if line.xref is None and line.tag not in {"HEAD", "TRLR"}
    ]
    xrefs = Counter(line.xref for line in lines if line.xref is not None)
    return (
        unknown
        + anonymous
        + [f"xref {xref} is defined {count} times" for xref, count in xrefs.items() if count > 1]
    )


def _header_problems(lines: Sequence[Line], rules: ValidationRules) -> list[str]:
    paths = _header_paths(lines)
    missing = [f"HEAD.{path} is missing" for path in sorted(rules.required_header_paths - paths.keys())]
    forbidden = [
        f"HEAD.{path} is not allowed" for path in sorted(rules.forbidden_header_paths & paths.keys())
    ]
    version = paths.get("GEDC.VERS", rules.version)
    wrong_version = [] if version == rules.version else [f"HEAD.GEDC.VERS is {version}, not {rules.version}"]
    return missing + forbidden + wrong_version


def _header_paths(lines: Sequence[Line]) -> dict[str, str]:
    header_end = next(
        (index for index, line in enumerate(lines) if index > 0 and line.level == 0), len(lines)
    )
    tags: list[str] = []
    paths: dict[str, str] = {}
    for line in lines[1:header_end]:
        tags = [*tags[: line.level - 1], line.tag]
        paths[".".join(tags)] = line.payload
    return paths


def _pointer_problems(lines: Sequence[Line]) -> list[str]:
    records = {line.xref: line.tag for line in lines if line.level == 0 and line.xref is not None}
    faults = [(line, _pointer_fault(line, records)) for line in lines]
    return [f"line {line.number}: {line.tag} {line.payload!r} {fault}" for line, fault in faults if fault]


def _pointer_fault(line: Line, records: dict[str, str]) -> str:
    if not _POINTER.fullmatch(line.payload):
        return "is not a pointer" if line.level == 1 and line.tag in _POINTER_ONLY_TAGS else ""
    target = records.get(line.payload)
    if line.payload == VOID_POINTER or target is None:
        return "" if line.payload == VOID_POINTER else "points to nothing"
    expected = _POINTER_TARGETS.get(line.tag, target)
    return "" if target == expected else f"points to a {target} record instead of {expected}"


def _continuation_problems(lines: Sequence[Line], rules: ValidationRules) -> list[str]:
    problems: list[str] = []
    for previous, current in pairwise(lines):
        if current.tag in {"CONC", "CONT"}:
            problems += _continuation_faults(previous, current, rules)
        elif previous.tag in {"CONC", "CONT"} and current.level > previous.level:
            problems.append(f"line {current.number}: a continuation line has substructures")
    return problems


def _continuation_faults(previous: Line, current: Line, rules: ValidationRules) -> list[str]:
    anchored = previous.level == current.level - 1 or (
        previous.tag in rules.continuation_tags and previous.level == current.level
    )
    faults = (
        []
        if current.tag in rules.continuation_tags
        else [f"{current.tag} is not part of GEDCOM {rules.version}"]
    )
    faults += [] if anchored else ["it does not directly follow the line it continues"]
    faults += [] if current.xref is None else ["it has an xref"]
    split_at_space = current.tag == "CONC" and (
        previous.payload.endswith(" ") or current.payload.startswith(" ")
    )
    faults += ["it splits the text next to a space"] if split_at_space else []
    return [f"line {current.number}: {fault}" for fault in faults]


def _enumeration_problems(lines: Sequence[Line], rules: ValidationRules) -> list[str]:
    allowed = {"SEX": rules.sex_values, "PEDI": rules.pedigree_values}
    return [
        f"line {line.number}: {line.tag} {line.payload!r} is not one of {sorted(allowed[line.tag])}"
        for line in lines
        if line.tag in allowed and line.payload not in allowed[line.tag]
    ]


def _escape_problems(lines: Sequence[Line], rules: ValidationRules) -> list[str]:
    return [
        f"line {line.number}: unescaped @ in {line.payload!r}"
        for line in lines
        if not _POINTER.fullmatch(line.payload) and rules.has_unescaped_at_sign(line.payload)
    ]


def _has_lone_at_sign(payload: str) -> bool:
    return "@" in _CALENDAR_ESCAPE.sub("", payload).replace("@@", "")


def _has_unescaped_leading_at_sign(payload: str) -> bool:
    return payload.startswith("@") and not payload.startswith("@@")


GEDCOM_551 = ValidationRules(
    version="5.5.1",
    required_header_paths=frozenset({"SOUR", "SUBM", "GEDC", "GEDC.VERS", "GEDC.FORM", "CHAR"}),
    forbidden_header_paths=frozenset(),
    continuation_tags=frozenset({"CONC", "CONT"}),
    sex_values=frozenset({"M", "F", "U"}),
    pedigree_values=frozenset({"adopted", "birth", "foster", "sealing", "other"}),
    max_line_length=255,
    has_unescaped_at_sign=_has_lone_at_sign,
)
GEDCOM_7 = ValidationRules(
    version="7.0",
    required_header_paths=frozenset({"GEDC", "GEDC.VERS"}),
    forbidden_header_paths=frozenset({"CHAR"}),
    continuation_tags=frozenset({"CONT"}),
    sex_values=frozenset({"M", "F", "X", "U"}),
    pedigree_values=frozenset({"ADOPTED", "BIRTH", "FOSTER", "SEALING", "OTHER"}),
    max_line_length=None,
    has_unescaped_at_sign=_has_unescaped_leading_at_sign,
)
