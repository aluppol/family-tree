import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured

from family_tree.domain.enums import (
    DateQualifier,
    InterchangeFormat,
    ParentLinkKind,
    PartnershipEndReason,
    PartnershipKind,
    Sex,
)

BASE_DIR = Path(__file__).resolve().parent.parent
ENVIRONMENTS = frozenset({"production", "development"})


def required_environment(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise ImproperlyConfigured(f"Set the environment variable {name}.")
    return value


def environment_switch() -> str:
    environment = required_environment("APP_ENV")
    if environment not in ENVIRONMENTS:
        raise ImproperlyConfigured(f"APP_ENV must be one of {sorted(ENVIRONMENTS)}, not {environment!r}.")
    return environment


IS_PRODUCTION = environment_switch() == "production"

SECRET_KEY = required_environment("DJANGO_SECRET_KEY")
DEBUG = not IS_PRODUCTION
ALLOWED_HOSTS = required_environment("APP_HOSTS").split(",")

INSTALLED_APPS = [
    "django.contrib.staticfiles",
    "rest_framework",
    "drf_spectacular",
    "drf_spectacular_sidecar",
    "family_tree.adapters.persistence.apps.PersistenceConfig",
    "family_tree.api.apps.ApiConfig",
]

MIDDLEWARE = [
    "family_tree.api.middleware.HealthCheckMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "family_tree.api.middleware.CrossSiteRequestGuardMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
APPEND_SLASH = True

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {"context_processors": ["django.template.context_processors.request"]},
    },
]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "HOST": required_environment("POSTGRES_HOST"),
        "PORT": required_environment("POSTGRES_PORT"),
        "NAME": required_environment("POSTGRES_DB"),
        "USER": required_environment("POSTGRES_USER"),
        "PASSWORD": required_environment("POSTGRES_PASSWORD"),
        "CONN_MAX_AGE": 60,
        "CONN_HEALTH_CHECKS": True,
    },
}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

IDENTITY_ISSUER = required_environment("IDENTITY_ISSUER")
IDENTITY_AUDIENCE = required_environment("IDENTITY_AUDIENCE")
IDENTITY_JWKS_URL = required_environment("IDENTITY_JWKS_URL")

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["family_tree.api.authentication.GatewayTokenAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["rest_framework.parsers.JSONParser"],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "family_tree.api.errors.render_exception",
    "UNAUTHENTICATED_USER": None,
    "UNAUTHENTICATED_TOKEN": None,
    "URL_FORMAT_OVERRIDE": None,
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Family Tree API",
    "DESCRIPTION": "People, parents, partners, the family chart and GEDCOM import and export.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "SWAGGER_UI_DIST": "SIDECAR",
    "SWAGGER_UI_FAVICON_HREF": "SIDECAR",
    "REDOC_DIST": "SIDECAR",
    "COMPONENT_SPLIT_REQUEST": True,
    "ENUM_NAME_OVERRIDES": {
        f"{enumeration.__name__}Enum": [member.value for member in enumeration]
        for enumeration in (
            DateQualifier,
            InterchangeFormat,
            ParentLinkKind,
            PartnershipEndReason,
            PartnershipKind,
            Sex,
        )
    },
}

DATA_UPLOAD_MAX_MEMORY_SIZE = 21 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 21 * 1024 * 1024

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
SPA_ROOT = BASE_DIR / "spa"
WHITENOISE_ROOT = SPA_ROOT if SPA_ROOT.is_dir() else None
WHITENOISE_AUTOREFRESH = not IS_PRODUCTION
WHITENOISE_USE_FINDERS = not IS_PRODUCTION
WHITENOISE_IMMUTABLE_FILE_TEST = r"^.+-[0-9A-Za-z_-]{8,}\.(?:js|css|svg|woff2|png|jpg|webp|map)$"
STATIC_FILES_STORAGE = (
    "whitenoise.storage.CompressedManifestStaticFilesStorage"
    if IS_PRODUCTION
    else "django.contrib.staticfiles.storage.StaticFilesStorage"
)
STORAGES = {"staticfiles": {"BACKEND": STATIC_FILES_STORAGE}}

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = IS_PRODUCTION
SECURE_HSTS_SECONDS = 31_536_000 if IS_PRODUCTION else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = IS_PRODUCTION
SECURE_HSTS_PRELOAD = IS_PRODUCTION
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
SECURE_CROSS_ORIGIN_OPENER_POLICY = "same-origin"
CSRF_COOKIE_SECURE = IS_PRODUCTION
X_FRAME_OPTIONS = "DENY"

LANGUAGE_CODE = "en"
TIME_ZONE = "UTC"
USE_I18N = False
USE_TZ = True

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {"plain": {"format": "{asctime} {levelname} {name} {message}", "style": "{"}},
    "handlers": {"console": {"class": "logging.StreamHandler", "formatter": "plain"}},
    "root": {"handlers": ["console"], "level": "INFO" if IS_PRODUCTION else "DEBUG"},
    "loggers": {"django.db.backends": {"level": "INFO"}},
}
