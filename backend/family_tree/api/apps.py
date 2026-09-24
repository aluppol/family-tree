from importlib import import_module

from django.apps import AppConfig


class ApiConfig(AppConfig):
    name = "family_tree.api"
    label = "api"

    def ready(self) -> None:
        import_module("family_tree.api.schema")
