import re

from family_tree.domain.date_notation import parse_date_notation
from family_tree.domain.dates import GenealogicalDate
from family_tree.domain.errors import InvalidInput

_GREGORIAN_MARKERS = re.compile(r"@#DGREGORIAN@|\bGREGORIAN\b")
_DUAL_YEAR = re.compile(r"\b(\d{1,4})/\d{1,2}\b")
_UNSUPPORTED_FORM = re.compile(
    r"(?P<period>^(?:FROM|TO)\b)"
    r"|(?P<phrase>^INT\b|\()"
    r"|(?P<calendar>@#D|\b(?:JULIAN|HEBREW|FRENCH_R)\b|\b_\w+)"
    r"|(?P<before_year_one>B\.C\.|\bBCE?\b)"
)
_EXPLANATIONS = {
    "period": "Periods (FROM, TO) are not supported.",
    "phrase": "Interpreted dates and date phrases are not supported.",
    "calendar": "Only Gregorian dates are supported.",
    "before_year_one": "Dates before the year 1 are not supported.",
}


def parse_gedcom_date(text: str) -> GenealogicalDate:
    normalized = " ".join(_GREGORIAN_MARKERS.sub(" ", text.upper()).split())
    _reject_unsupported_forms(normalized)
    return parse_date_notation(_DUAL_YEAR.sub(_new_style_year, normalized))


def _reject_unsupported_forms(normalized: str) -> None:
    unsupported = _UNSUPPORTED_FORM.search(normalized)
    if unsupported is not None and unsupported.lastgroup is not None:
        raise InvalidInput("gedcom.unsupported_date", _EXPLANATIONS[unsupported.lastgroup])


def _new_style_year(dual_year: re.Match[str]) -> str:
    return str(int(dual_year[1]) + 1)
