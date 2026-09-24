import re

from family_tree.domain.date_notation import parse_date_notation
from family_tree.domain.dates import GenealogicalDate
from family_tree.domain.errors import InvalidInput

_GREGORIAN_MARKERS = re.compile(r"@#DGREGORIAN@|\bGREGORIAN\b")
_DUAL_YEAR = re.compile(r"\b(\d{1,4})/\d{1,2}\b")
_UNSUPPORTED_FORMS = (
    (re.compile(r"^(?:FROM|TO)\b"), "Periods (FROM, TO) are not supported."),
    (re.compile(r"^INT\b|\("), "Interpreted dates and date phrases are not supported."),
    (re.compile(r"@#D|\b(?:JULIAN|HEBREW|FRENCH_R)\b|\b_\w+"), "Only Gregorian dates are supported."),
    (re.compile(r"B\.C\.|\bBCE?\b"), "Dates before the year 1 are not supported."),
)


def parse_gedcom_date(text: str) -> GenealogicalDate:
    normalized = " ".join(_GREGORIAN_MARKERS.sub(" ", text.upper()).split())
    _reject_unsupported_forms(normalized)
    return parse_date_notation(_DUAL_YEAR.sub(_new_style_year, normalized))


def _reject_unsupported_forms(normalized: str) -> None:
    for form, explanation in _UNSUPPORTED_FORMS:
        if form.search(normalized):
            raise InvalidInput("gedcom.unsupported_date", explanation)


def _new_style_year(dual_year: re.Match[str]) -> str:
    return str(int(dual_year[1]) + 1)
