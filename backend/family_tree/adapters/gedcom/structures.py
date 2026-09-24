from dataclasses import dataclass


@dataclass(frozen=True, slots=True, kw_only=True)
class Structure:
    tag: str
    text: str = ""
    pointer: str = ""
    xref: str = ""
    children: tuple["Structure", ...] = ()


def individual_xref(person_id: int) -> str:
    return f"@I{person_id}@"


def media_xref(person_id: int) -> str:
    return f"@O{person_id}@"
