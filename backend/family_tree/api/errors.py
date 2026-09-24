from collections.abc import Callable, Mapping, Sequence
from typing import Any

from django.http import Http404, HttpRequest, JsonResponse
from rest_framework import exceptions, status
from rest_framework.response import Response

from family_tree.domain.errors import (
    AccessDenied,
    DomainError,
    IdentityUnavailable,
    InvalidInput,
    NotFound,
    RuleViolation,
    Unauthenticated,
    WorkspaceAlreadyExists,
)

AUTHENTICATION_CHALLENGE = 'Bearer realm="family-tree"'

STATUS_BY_DOMAIN_ERROR: Mapping[type[DomainError], int] = {
    InvalidInput: status.HTTP_400_BAD_REQUEST,
    RuleViolation: status.HTTP_400_BAD_REQUEST,
    NotFound: status.HTTP_404_NOT_FOUND,
    AccessDenied: status.HTTP_403_FORBIDDEN,
    Unauthenticated: status.HTTP_401_UNAUTHORIZED,
    IdentityUnavailable: status.HTTP_503_SERVICE_UNAVAILABLE,
    WorkspaceAlreadyExists: status.HTTP_409_CONFLICT,
}

FRAMEWORK_ERRORS: Sequence[tuple[type[exceptions.APIException], str, str]] = (
    (exceptions.NotAuthenticated, "auth.unauthenticated", "Your session has ended; sign in again."),
    (exceptions.AuthenticationFailed, "auth.unauthenticated", "Your session has ended; sign in again."),
    (exceptions.PermissionDenied, "auth.forbidden", "You are not allowed to do this."),
    (exceptions.NotFound, "route.not_found", "There is nothing at this address."),
    (exceptions.MethodNotAllowed, "request.method_not_allowed", "This address does not accept this method."),
    (exceptions.UnsupportedMediaType, "request.unsupported_media_type", "This content type is not accepted."),
    (exceptions.ParseError, "request.malformed", "The request body could not be read."),
)


def error_body(code: str, message: str, fields: Mapping[str, Sequence[str]] | None = None) -> dict[str, Any]:
    return {
        "error": {
            "code": code,
            "message": message,
            "fields": {key: list(value) for key, value in (fields or {}).items()},
        }
    }


def render_exception(exception: Exception, _context: Mapping[str, Any]) -> Response | None:
    renderer = next((render for kind, render in _RENDERERS if isinstance(exception, kind)), None)
    return None if renderer is None else renderer(exception)


def flatten_field_errors(detail: object, prefix: str = "") -> dict[str, list[str]]:
    if isinstance(detail, Mapping):
        return _flatten_mapping(detail, prefix)
    if isinstance(detail, list) and all(isinstance(entry, (Mapping, list)) for entry in detail):
        return _flatten_mapping(dict(enumerate(detail)), prefix)
    messages = detail if isinstance(detail, list) else [detail]
    return {prefix or "non_field_errors": [str(message) for message in messages]}


def api_not_found(request: HttpRequest) -> JsonResponse:
    return JsonResponse(error_body("route.not_found", f"There is nothing at {request.path}."), status=404)


def server_error(_request: HttpRequest) -> JsonResponse:
    return JsonResponse(
        error_body("server.error", "Something went wrong on our side; try again."), status=500
    )


def _domain_error_response(error: DomainError) -> Response:
    fields = error.fields if isinstance(error, InvalidInput) else None
    status_code = STATUS_BY_DOMAIN_ERROR[type(error)]
    return _challenged(Response(error_body(error.code, error.message, fields), status=status_code))


def _validation_error_response(exception: exceptions.ValidationError) -> Response:
    fields = flatten_field_errors(exception.detail)
    return Response(error_body("validation.invalid", "Some fields need attention.", fields), status=400)


def _not_found_response(_exception: Http404) -> Response:
    return Response(error_body("route.not_found", "There is nothing at this address."), status=404)


def _framework_error_response(exception: exceptions.APIException) -> Response:
    code, message = next(
        ((code, message) for kind, code, message in FRAMEWORK_ERRORS if isinstance(exception, kind)),
        ("request.rejected", str(exception.detail)),
    )
    return _challenged(Response(error_body(code, message), status=exception.status_code))


def _challenged(response: Response) -> Response:
    if response.status_code == status.HTTP_401_UNAUTHORIZED:
        response["WWW-Authenticate"] = AUTHENTICATION_CHALLENGE
    return response


def _flatten_mapping(detail: Mapping[Any, object], prefix: str) -> dict[str, list[str]]:
    flattened: dict[str, list[str]] = {}
    for key, value in detail.items():
        flattened |= flatten_field_errors(value, f"{prefix}.{key}" if prefix else str(key))
    return flattened


_RENDERERS: Sequence[tuple[type[Exception], Callable[[Any], Response]]] = (
    (DomainError, _domain_error_response),
    (exceptions.ValidationError, _validation_error_response),
    (Http404, _not_found_response),
    (exceptions.APIException, _framework_error_response),
)
