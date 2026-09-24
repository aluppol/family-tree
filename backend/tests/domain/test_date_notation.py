import pytest

from family_tree.domain.date_notation import format_date_notation, parse_date_notation
from family_tree.domain.dates import CalendarDate, GenealogicalDate
from family_tree.domain.enums import DateQualifier
from family_tree.domain.errors import InvalidInput

ROUND_TRIPS = [
    ("12 FEB 1809", GenealogicalDate(DateQualifier.EXACT, CalendarDate(1809, 2, 12))),
    ("FEB 1809", GenealogicalDate(DateQualifier.EXACT, CalendarDate(1809, 2))),
    ("1809", GenealogicalDate(DateQualifier.EXACT, CalendarDate(1809))),
    ("ABT 1765", GenealogicalDate(DateQualifier.ABOUT, CalendarDate(1765))),
    ("CAL 1700", GenealogicalDate(DateQualifier.CALCULATED, CalendarDate(1700))),
    ("EST 1650", GenealogicalDate(DateQualifier.ESTIMATED, CalendarDate(1650))),
    ("BEF MAR 1790", GenealogicalDate(DateQualifier.BEFORE, CalendarDate(1790, 3))),
    ("AFT 1790", GenealogicalDate(DateQualifier.AFTER, CalendarDate(1790))),
    (
        "BET 1760 AND 2 MAY 1762",
        GenealogicalDate(DateQualifier.BETWEEN, CalendarDate(1760), CalendarDate(1762, 5, 2)),
    ),
]


@pytest.mark.parametrize(("notation", "genealogical_date"), ROUND_TRIPS)
def test_parses_notation(notation: str, genealogical_date: GenealogicalDate) -> None:
    assert parse_date_notation(notation) == genealogical_date


@pytest.mark.parametrize(("notation", "genealogical_date"), ROUND_TRIPS)
def test_formats_notation(notation: str, genealogical_date: GenealogicalDate) -> None:
    assert format_date_notation(genealogical_date) == notation


def test_normalizes_case_and_spacing() -> None:
    assert parse_date_notation("  abt   1765 ") == GenealogicalDate(DateQualifier.ABOUT, CalendarDate(1765))


@pytest.mark.parametrize(
    "notation",
    [
        "",
        "FOO 1809",
        "12 1809",
        "31 FEB 1809",
        "12 FOO 1809",
        "FROM 1800 TO 1810",
        "INT 1800 (guess)",
        "1750/51",
    ],
)
def test_rejects_unsupported_notation(notation: str) -> None:
    with pytest.raises(InvalidInput):
        parse_date_notation(notation)
