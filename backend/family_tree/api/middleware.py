from collections.abc import Callable

from django.http import HttpRequest, HttpResponse, JsonResponse

from family_tree.api.errors import error_body
from family_tree.dependencies import container

HEALTH_PATH = "/healthz"
UNSAFE_METHODS = frozenset({"POST", "PUT", "PATCH", "DELETE"})
SAME_SITE_FETCHES = frozenset({"same-origin", "none"})
MEGABYTE = 1024 * 1024
BODY_LIMITS = {"application/json": MEGABYTE, "multipart/form-data": 21 * MEGABYTE}
OTHER_BODY_LIMIT = 2 * MEGABYTE + 64 * 1024


class HealthCheckMiddleware:
    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        if request.path != HEALTH_PATH:
            return self.get_response(request)
        if container().database_probe():
            return JsonResponse({"status": "ok"})
        return JsonResponse({"status": "database unavailable"}, status=503)


class CrossSiteRequestGuardMiddleware:
    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        fetch_site = request.headers.get("Sec-Fetch-Site")
        if (
            request.method in UNSAFE_METHODS
            and fetch_site is not None
            and fetch_site not in SAME_SITE_FETCHES
        ):
            body = error_body("request.cross_site", "Changes can only come from the Family Tree app itself.")
            return JsonResponse(body, status=403)
        return self.get_response(request)


class RequestSizeGuardMiddleware:
    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        declared_length = request.META.get("CONTENT_LENGTH") or "0"
        limit = BODY_LIMITS.get(request.content_type or "", OTHER_BODY_LIMIT)
        if not declared_length.isdigit() or int(declared_length) > limit:
            body = error_body("request.too_large", f"The request is larger than {limit // 1024} KB.")
            return JsonResponse(body, status=413)
        return self.get_response(request)
