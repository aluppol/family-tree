from typing import Any

from drf_spectacular.extensions import OpenApiAuthenticationExtension


class GatewayAccessTokenScheme(OpenApiAuthenticationExtension):
    target_class = "family_tree.api.authentication.GatewayTokenAuthentication"
    name = "gatewayAccessToken"

    def get_security_definition(self, _auto_schema: Any) -> dict[str, str]:
        return {
            "type": "apiKey",
            "in": "header",
            "name": "X-Forwarded-Access-Token",
            "description": "The Keycloak access token that the gateway adds after sign-in.",
        }
