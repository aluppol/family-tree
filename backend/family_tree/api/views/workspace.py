from drf_spectacular.utils import extend_schema
from rest_framework.request import Request
from rest_framework.response import Response

from family_tree.api.authentication import principal_of
from family_tree.api.dto import HomePersonInputSerializer, ViewerSerializer, WorkspaceSerializer, validated
from family_tree.api.views.base import WorkspaceApiView
from family_tree.dependencies import container


class ViewerView(WorkspaceApiView):
    @extend_schema(responses=ViewerSerializer, summary="The signed-in person")
    def get(self, request: Request) -> Response:
        return Response(ViewerSerializer(principal_of(request)).data)


class WorkspaceView(WorkspaceApiView):
    @extend_schema(responses=WorkspaceSerializer, summary="The signed-in person's family tree")
    def get(self, request: Request) -> Response:
        return Response(WorkspaceSerializer(container().workspaces.overview(principal_of(request))).data)


class HomePersonView(WorkspaceApiView):
    @extend_schema(
        request=HomePersonInputSerializer, responses=WorkspaceSerializer, summary="Choose the home person"
    )
    def put(self, request: Request) -> Response:
        principal = principal_of(request)
        choice = validated(HomePersonInputSerializer, request.data)
        container().workspaces.choose_home_person(principal, choice.person_id)
        return Response(WorkspaceSerializer(container().workspaces.overview(principal)).data)
