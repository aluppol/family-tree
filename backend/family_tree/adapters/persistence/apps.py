from django.apps import AppConfig


class PersistenceConfig(AppConfig):
    name = "family_tree.adapters.persistence"
    label = "people"
    default_auto_field = "django.db.models.BigAutoField"
