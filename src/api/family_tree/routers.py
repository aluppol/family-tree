class MetaRouter:
    services = ['people']

    def db_for_read(self, model, **hints):
        return model._meta.app_label if model._meta.app_label in self.services else None

    def db_for_write(self, model, **hints):
        return model._meta.app_label if model._meta.app_label in self.services else None

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        print('model_name = ', model_name);
        if model_name == 'django_migrations':
            return db == 'public'
        elif app_label in self.services:
            return db == app_label
        return None

