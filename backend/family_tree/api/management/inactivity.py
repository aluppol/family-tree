from django.core.management.base import CommandError, CommandParser

from family_tree.domain.errors import InvalidInput
from family_tree.domain.members import InactivityPeriod, MemberActivity


def add_period_argument(parser: CommandParser) -> None:
    parser.add_argument("days", type=int, help="How many days ago, at least, a member was last active.")


def inactivity_period_of(days: int) -> InactivityPeriod:
    try:
        return InactivityPeriod(days)
    except InvalidInput as error:
        raise CommandError(error.message) from error


def activity_line(activity: MemberActivity) -> str:
    return f"{activity.subject}  last active {activity.last_active_at:%Y-%m-%d}"
