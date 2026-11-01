from typing import Any

from django.core.management.base import BaseCommand, CommandParser

from family_tree.api.management.inactivity import activity_line, add_period_argument, inactivity_period_of
from family_tree.dependencies import container


class Command(BaseCommand):
    help = (
        "Remove the family tree of every member that inactive_members DAYS lists, with its people, links "
        "and photos. Guests and administrators are never removed; the Keycloak account stays."
    )

    def add_arguments(self, parser: CommandParser) -> None:
        add_period_argument(parser)

    def handle(self, *_args: Any, **options: Any) -> None:
        period = inactivity_period_of(options["days"])
        members = container().members
        inactive = members.inactive_members(period)
        members.remove_inactive_members(period)
        removed = f"Removed {len(inactive)} member tree(s)"
        self.stdout.write(f"{removed} inactive for at least {period.days} day(s).")
        for activity in inactive:
            self.stdout.write(activity_line(activity))
