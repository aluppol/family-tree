import re

from family_tree.domain.dates import CalendarDate, GenealogicalDate, invalid_date
from family_tree.domain.enums import DateQualifier

MONTH_NAMES = ("JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC")

_PREFIX_BY_QUALIFIER = {
    DateQualifier.ABOUT: "ABT",
    DateQualifier.CALCULATED: "CAL",
    DateQualifier.ESTIMATED: "EST",
    DateQualifier.BEFORE: "BEF",
    DateQualifier.AFTER: "AFT",
}
_QUALIFIER_BY_PREFIX = {prefix: qualifier for qualifier, prefix in _PREFIX_BY_QUALIFIER.items()}
_CALENDAR_DATE = re.compile(r"^(?:(?P<day>\d{1,2}) )?(?:(?P<month>[A-Z]{3}) )?(?P<year>\d{1,4})$")
_RANGE = re.compile(r"^BET (?P<start>.+) AND (?P<end>.+)$")


def format_date_notation(genealogical_date: GenealogicalDate) -> str:
    if genealogical_date.until is not None:
        start = format_calendar_notation(genealogical_date.value)
        return f"BET {start} AND {format_calendar_notation(genealogical_date.until)}"
    body = format_calendar_notation(genealogical_date.value)
    prefix = _PREFIX_BY_QUALIFIER.get(genealogical_date.qualifier)
    return body if prefix is None else f"{prefix} {body}"


def format_calendar_notation(calendar_date: CalendarDate) -> str:
    day = [] if calendar_date.day is None else [str(calendar_date.day)]
    month = [] if calendar_date.month is None else [MONTH_NAMES[calendar_date.month - 1]]
    return " ".join([*day, *month, str(calendar_date.year)])


def parse_date_notation(text: str) -> GenealogicalDate:
    normalized = " ".join(text.upper().split())
    range_match = _RANGE.match(normalized)
    if range_match is not None:
        start = parse_calendar_notation(range_match["start"])
        return GenealogicalDate(DateQualifier.BETWEEN, start, parse_calendar_notation(range_match["end"]))
    prefix, _, remainder = normalized.partition(" ")
    qualifier = _QUALIFIER_BY_PREFIX.get(prefix)
    if qualifier is None:
        return GenealogicalDate(DateQualifier.EXACT, parse_calendar_notation(normalized))
    return GenealogicalDate(qualifier, parse_calendar_notation(remainder))


def parse_calendar_notation(text: str) -> CalendarDate:
    match = _CALENDAR_DATE.match(text)
    if match is None:
        raise invalid_date(f"'{text}' is not a date like '12 FEB 1809', 'FEB 1809' or '1809'.")
    return CalendarDate(
        year=int(match["year"]),
        month=_parse_month(match["month"]),
        day=None if match["day"] is None else int(match["day"]),
    )


def _parse_month(month_name: str | None) -> int | None:
    if month_name is None:
        return None
    if month_name not in MONTH_NAMES:
        raise invalid_date(f"'{month_name}' is not a month; use JAN to DEC.")
    return MONTH_NAMES.index(month_name) + 1
