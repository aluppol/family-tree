from typing import Any

from django.core.management.base import BaseCommand

from family_tree.dependencies import container


class Command(BaseCommand):
    help = "Remove every guest sandbox; each guest gets a fresh copy of the demo family on their next visit."

    def handle(self, *_args: Any, **_options: Any) -> None:
        demo = container().demo
        sandboxes = demo.count_sandboxes()
        demo.reset()
        self.stdout.write(f"Removed {sandboxes} guest sandbox(es).")
