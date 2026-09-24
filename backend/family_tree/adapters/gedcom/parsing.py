from collections.abc import Sequence

from family_tree.adapters.gedcom.decoding import decode_gedcom
from family_tree.adapters.gedcom.errors import too_large
from family_tree.adapters.gedcom.limits import MAX_INDIVIDUALS
from family_tree.adapters.gedcom.lines import GedcomLine, parse_lines
from family_tree.adapters.gedcom.nodes import GedcomFile
from family_tree.adapters.gedcom.tree import build_gedcom_file


def parse_gedcom(encoded: bytes) -> GedcomFile:
    lines = parse_lines(decode_gedcom(encoded))
    _require_individuals_within_limit(lines)
    return build_gedcom_file(lines)


def _require_individuals_within_limit(lines: Sequence[GedcomLine]) -> None:
    individual_count = sum(1 for line in lines if line.level == 0 and line.tag == "INDI")
    if individual_count > MAX_INDIVIDUALS:
        raise too_large(
            f"The file has {individual_count:,} people; at most {MAX_INDIVIDUALS:,} can be imported at once."
        )
