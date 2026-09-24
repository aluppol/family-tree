from dataclasses import dataclass

from rest_framework.authentication import BaseAuthentication
from rest_framework.request import Request

from family_tree.api.errors import AUTHENTICATION_CHALLENGE
from family_tree.dependencies import container
from family_tree.domain.errors import Unauthenticated
from family_tree.domain.workspaces import Principal

FORWARDED_ACCESS_HEADER = "HTTP_X_FORWARDED_ACCESS_TOKEN"


@dataclass(frozen=True, slots=True)
class AuthenticatedPrincipal:
    principal: Principal
    is_authenticated: bool = True


class GatewayTokenAuthentication(BaseAuthentication):
    def authenticate(self, request: Request) -> tuple[AuthenticatedPrincipal, None] | None:
        token = request.META.get(FORWARDED_ACCESS_HEADER, "")
        if not token:
            return None
        return AuthenticatedPrincipal(container().token_verifier.verify(token)), None

    def authenticate_header(self, _request: Request) -> str:
        return AUTHENTICATION_CHALLENGE


def principal_of(request: Request) -> Principal:
    user: object = request.user
    if not isinstance(user, AuthenticatedPrincipal):
        raise Unauthenticated("auth.unauthenticated", "Your session has ended; sign in again.")
    return user.principal
