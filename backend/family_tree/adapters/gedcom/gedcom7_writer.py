from family_tree.adapters.gedcom.continuation import gedcom7_text_lines
from family_tree.adapters.gedcom.export_dialect import SOURCE_SYSTEM, ExportDialect
from family_tree.adapters.gedcom.rendering import render_gedcom
from family_tree.adapters.gedcom.structures import Structure
from family_tree.domain.enums import ParentLinkKind, Sex
from family_tree.domain.interchange import TreeSnapshot

BYTE_ORDER_MARK = "﻿"

GEDCOM_7_DIALECT = ExportDialect(
    preamble=BYTE_ORDER_MARK,
    header=(
        Structure(
            tag="HEAD",
            children=(Structure(tag="GEDC", children=(Structure(tag="VERS", text="7.0"),)), SOURCE_SYSTEM),
        ),
    ),
    sex_codes={Sex.MALE: "M", Sex.FEMALE: "F", Sex.OTHER: "X", Sex.UNKNOWN: "U"},
    pedigree_codes={
        ParentLinkKind.ADOPTED: "ADOPTED",
        ParentLinkKind.FOSTER: "FOSTER",
        ParentLinkKind.OTHER: "OTHER",
    },
    text_lines=gedcom7_text_lines,
)


class Gedcom7Writer:
    def write(self, snapshot: TreeSnapshot) -> bytes:
        return render_gedcom(snapshot, GEDCOM_7_DIALECT, {})
