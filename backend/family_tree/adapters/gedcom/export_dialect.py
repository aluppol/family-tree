from collections.abc import Mapping
from dataclasses import dataclass

from family_tree.adapters.gedcom.continuation import TextLines
from family_tree.adapters.gedcom.structures import Structure
from family_tree.domain.enums import ParentLinkKind, Sex

SOURCE_SYSTEM = Structure(
    tag="SOUR",
    text="FAMILY_TREE",
    children=(Structure(tag="VERS", text="1.0"), Structure(tag="NAME", text="Family Tree")),
)


@dataclass(frozen=True, slots=True, kw_only=True)
class ExportDialect:
    preamble: str
    header: tuple[Structure, ...]
    sex_codes: Mapping[Sex, str]
    pedigree_codes: Mapping[ParentLinkKind, str]
    text_lines: TextLines
