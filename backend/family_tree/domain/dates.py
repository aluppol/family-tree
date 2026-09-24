from calendar import monthrange
from dataclasses import dataclass
from datetime import date

from family_tree.domain.enums import DateQualifier
from family_tree.domain.errors import InvalidInput

APPROXIMATION_MARGIN_YEARS = 10
EARLIEST_YEAR = 1
LATEST_YEAR = 9999
LAST_MONTH = 12
APPROXIMATE_QUALIFIERS = frozenset({DateQualifier.ABOUT, DateQualifier.CALCULATED, DateQualifier.ESTIMATED})


@dataclass(frozen=True, slots=True)
class CalendarDate:
    year: int
    month: int | None = None
    day: int | None = None

    def __post_init__(self) -> None:
        _require_year(self.year)
        _require_month(self.month)
        _require_day(self)

    def first_day(self) -> date:
        return date(self.year, self.month or 1, self.day or 1)

    def last_day(self) -> date:
        month = self.month or LAST_MONTH
        return date(self.year, month, self.day or monthrange(self.year, month)[1])


@dataclass(frozen=True, slots=True)
class GenealogicalDate:
    qualifier: DateQualifier
    value: CalendarDate
    until: CalendarDate | None = None

    def __post_init__(self) -> None:
        _require_range_shape(self)

    def earliest(self) -> date | None:
        if self.qualifier is DateQualifier.BEFORE:
            return None
        if self.qualifier in APPROXIMATE_QUALIFIERS:
            return date(max(self.value.year - APPROXIMATION_MARGIN_YEARS, EARLIEST_YEAR), 1, 1)
        return self.value.first_day()

    def latest(self) -> date | None:
        if self.qualifier is DateQualifier.AFTER:
            return None
        if self.qualifier in APPROXIMATE_QUALIFIERS:
            return date(min(self.value.year + APPROXIMATION_MARGIN_YEARS, LATEST_YEAR), LAST_MONTH, 31)
        if self.until is not None:
            return self.until.last_day()
        return self.value.last_day()

    def sort_key(self) -> date:
        return self.value.first_day()


def is_certainly_later(candidate: GenealogicalDate, reference: GenealogicalDate) -> bool:
    candidate_earliest = candidate.earliest()
    reference_latest = reference.latest()
    if candidate_earliest is None or reference_latest is None:
        return False
    return candidate_earliest > reference_latest


def invalid_date(message: str) -> InvalidInput:
    return InvalidInput("validation.invalid_date", message)


def _require_year(year: int) -> None:
    if not EARLIEST_YEAR <= year <= LATEST_YEAR:
        raise invalid_date(f"Year {year} must be between {EARLIEST_YEAR} and {LATEST_YEAR}.")


def _require_month(month: int | None) -> None:
    if month is not None and not 1 <= month <= LAST_MONTH:
        raise invalid_date(f"Month {month} must be between 1 and 12.")


def _require_day(calendar_date: CalendarDate) -> None:
    if calendar_date.day is None:
        return
    if calendar_date.month is None:
        raise invalid_date("A day needs a month.")
    days_in_month = monthrange(calendar_date.year, calendar_date.month)[1]
    if not 1 <= calendar_date.day <= days_in_month:
        raise invalid_date(
            f"Day {calendar_date.day} does not exist in {calendar_date.year}-{calendar_date.month:02d}."
        )


def _require_range_shape(genealogical_date: GenealogicalDate) -> None:
    is_range = genealogical_date.qualifier is DateQualifier.BETWEEN
    if is_range != (genealogical_date.until is not None):
        raise invalid_date("A 'between' date needs a second date, and only a 'between' date has one.")
    until = genealogical_date.until
    if until is not None and until.last_day() < genealogical_date.value.first_day():
        raise invalid_date("The second date of a range is before the first.")
