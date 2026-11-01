from typing import Any

from rest_framework.request import Request
from rest_framework.views import APIView

from family_tree.api.authentication import principal_of
from family_tree.dependencies import container


class WorkspaceApiView(APIView):
    def initial(self, request: Request, *args: Any, **kwargs: Any) -> None:
        super().initial(request, *args, **kwargs)
        principal = principal_of(request)
        container().workspaces.ensure_workspace(principal)
        container().members.record_activity(principal)
