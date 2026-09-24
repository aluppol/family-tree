from family_tree.adapters.gedcom.continuation import gedcom551_text_lines
from family_tree.adapters.gedcom.export_dialect import SOURCE_SYSTEM, ExportDialect
from family_tree.adapters.gedcom.rendering import render_gedcom
from family_tree.adapters.gedcom.structures import Structure
from family_tree.domain.enums import ParentLinkKind, Sex
from family_tree.domain.interchange import TreeSnapshot

SUBMITTER_XREF = "@U1@"

GEDCOM_551_DIALECT = ExportDialect(
    preamble="",
    header=(
        Structure(
            tag="HEAD",
            children=(
                SOURCE_SYSTEM,
                Structure(tag="SUBM", pointer=SUBMITTER_XREF),
                Structure(
                    tag="GEDC",
                    children=(
                        Structure(tag="VERS", text="5.5.1"),
                        Structure(tag="FORM", text="LINEAGE-LINKED"),
                    ),
                ),
                Structure(tag="CHAR", text="UTF-8"),
            ),
        ),
        Structure(tag="SUBM", xref=SUBMITTER_XREF, children=(Structure(tag="NAME", text="Family Tree"),)),
    ),
    sex_codes={Sex.MALE: "M", Sex.FEMALE: "F", Sex.OTHER: "U", Sex.UNKNOWN: "U"},
    pedigree_codes={
        ParentLinkKind.ADOPTED: "adopted",
        ParentLinkKind.FOSTER: "foster",
        ParentLinkKind.OTHER: "other",
    },
    text_lines=gedcom551_text_lines,
)


class Gedcom551Writer:
    def write(self, snapshot: TreeSnapshot) -> bytes:
        return render_gedcom(snapshot, GEDCOM_551_DIALECT, {})
