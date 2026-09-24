from django.conf import settings
from django.http import HttpRequest, HttpResponse

APP_SECURITY_POLICY = "; ".join(
    [
        "default-src 'self'",
        "img-src 'self' data: blob:",
        "style-src 'self'",
        "script-src 'self'",
        "connect-src 'self'",
        "font-src 'self'",
        "object-src 'none'",
        "base-uri 'none'",
        "form-action 'self'",
        "frame-ancestors 'none'",
    ]
)
NOT_BUILT = "The web app is not built into this server. For development run `npm run dev` in frontend/."


def single_page_app(_request: HttpRequest) -> HttpResponse:
    index = settings.SPA_ROOT / "index.html"
    if not index.is_file():
        return HttpResponse(NOT_BUILT, status=404, content_type="text/plain; charset=utf-8")
    return HttpResponse(
        index.read_bytes(),
        content_type="text/html; charset=utf-8",
        headers={"Content-Security-Policy": APP_SECURITY_POLICY, "Cache-Control": "no-cache"},
    )


def gateway_path_not_found(_request: HttpRequest) -> HttpResponse:
    return HttpResponse("Not found", status=404, content_type="text/plain; charset=utf-8")
