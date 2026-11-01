from typing import Any

from django.core.management.base import BaseCommand, CommandParser

from family_tree.api.management.inactivity import activity_line, add_period_argument, inactivity_period_of
from family_tree.dependencies import container


class Command(BaseCommand):
    help = (
        "List the members last active at least DAYS days ago: Keycloak subject and last active date (UTC). "
        "Administrators and members not seen since activity tracking began are never listed."
    )

    def add_arguments(self, parser: CommandParser) -> None:
        add_period_argument(parser)

    def handle(self, *_args: Any, **options: Any) -> None:
        period = inactivity_period_of(options["days"])
        members = container().members
        inactive = members.inactive_members(period)
        self.stdout.write(f"Members: {members.count_members()}.")
        self.stdout.write(f"Inactive for at least {period.days} day(s): {len(inactive)}.")
        for activity in inactive:
            self.stdout.write(activity_line(activity))
