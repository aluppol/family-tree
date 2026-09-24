from datetime import date

import pytest

from family_tree.domain.dates import CalendarDate, GenealogicalDate, is_certainly_later
from family_tree.domain.enums import DateQualifier
from family_tree.domain.errors import InvalidInput


def on(year: int, month: int | None = None, day: int | None = None) -> GenealogicalDate:
    return GenealogicalDate(DateQualifier.EXACT, CalendarDate(year, month, day))


def qualified(qualifier: DateQualifier, year: int, until: int | None = None) -> GenealogicalDate:
    return GenealogicalDate(qualifier, CalendarDate(year), None if until is None else CalendarDate(until))


@pytest.mark.parametrize(
    ("year", "month", "day"),
    [(1809, 2, 12), (1809, 2, None), (1809, None, None), (2000, 2, 29), (1, 1, 1), (9999, 12, 31)],
)
def test_accepts_real_calendar_dates(year: int, month: int | None, day: int | None) -> None:
    assert CalendarDate(year, month, day).year == year


@pytest.mark.parametrize(
    ("year", "month", "day", "message"),
    [
        (0, None, None, "Year 0 must be between 1 and 9999."),
        (10000, None, None, "Year 10000 must be between 1 and 9999."),
        (1809, 13, None, "Month 13 must be between 1 and 12."),
        (1809, None, 12, "A day needs a month."),
        (1809, 2, 30, "Day 30 does not exist in 1809-02."),
        (1900, 2, 29, "Day 29 does not exist in 1900-02."),
    ],
)
def test_rejects_impossible_calendar_dates(
    year: int, month: int | None, day: int | None, message: str
) -> None:
    with pytest.raises(InvalidInput, match=message) as raised:
        CalendarDate(year, month, day)
    assert raised.value.code == "validation.invalid_date"


@pytest.mark.parametrize(
    ("genealogical_date", "earliest", "latest"),
    [
        (on(1809, 2, 12), date(1809, 2, 12), date(1809, 2, 12)),
        (on(1809, 2), date(1809, 2, 1), date(1809, 2, 28)),
        (on(1808), date(1808, 1, 1), date(1808, 12, 31)),
        (qualified(DateQualifier.ABOUT, 1765), date(1755, 1, 1), date(1775, 12, 31)),
        (qualified(DateQualifier.CALCULATED, 1765), date(1755, 1, 1), date(1775, 12, 31)),
        (qualified(DateQualifier.ESTIMATED, 5), date(1, 1, 1), date(15, 12, 31)),
        (qualified(DateQualifier.BEFORE, 1790), None, date(1790, 12, 31)),
        (qualified(DateQualifier.AFTER, 1790), date(1790, 1, 1), None),
        (qualified(DateQualifier.BETWEEN, 1760, until=1762), date(1760, 1, 1), date(1762, 12, 31)),
    ],
)
def test_bounds_reflect_precision_and_qualifier(
    genealogical_date: GenealogicalDate, earliest: date | None, latest: date | None
) -> None:
    assert (genealogical_date.earliest(), genealogical_date.latest()) == (earliest, latest)


def test_sort_key_is_the_first_possible_day() -> None:
    assert qualified(DateQualifier.BEFORE, 1790).sort_key() == date(1790, 1, 1)


@pytest.mark.parametrize(
    ("qualifier", "value", "until"),
    [
        (DateQualifier.BETWEEN, CalendarDate(1760), None),
        (DateQualifier.EXACT, CalendarDate(1760), CalendarDate(1762)),
        (DateQualifier.BETWEEN, CalendarDate(1762), CalendarDate(1760)),
    ],
)
def test_rejects_malformed_ranges(
    qualifier: DateQualifier, value: CalendarDate, until: CalendarDate | None
) -> None:
    with pytest.raises(InvalidInput):
        GenealogicalDate(qualifier, value, until)


@pytest.mark.parametrize(
    ("candidate", "reference", "is_later"),
    [
        (on(1810), on(1809), True),
        (on(1809), on(1809), False),
        (on(1809, 12), on(1809), False),
        (qualified(DateQualifier.ABOUT, 1815), on(1809), False),
        (qualified(DateQualifier.ABOUT, 1830), on(1809), True),
        (qualified(DateQualifier.AFTER, 1800), on(1809), False),
        (on(1850), qualified(DateQualifier.AFTER, 1800), False),
        (on(1850), qualified(DateQualifier.BEFORE, 1800), True),
    ],
)
def test_is_certainly_later_only_when_the_ranges_cannot_overlap(
    candidate: GenealogicalDate, reference: GenealogicalDate, is_later: bool
) -> None:
    assert is_certainly_later(candidate, reference) is is_later
