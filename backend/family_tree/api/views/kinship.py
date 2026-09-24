from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response

from family_tree.api.authentication import principal_of
from family_tree.api.dto import (
    ParentLinkInputSerializer,
    ParentLinkKindInputSerializer,
    ParentLinkSerializer,
    PartnershipInputSerializer,
    PartnershipSerializer,
    PartnershipTermsInputSerializer,
    validated,
)
from family_tree.api.views.base import WorkspaceApiView
from family_tree.dependencies import container
from family_tree.domain.identifiers import ParentLinkId, PartnershipId


class ParentLinksView(WorkspaceApiView):
    @extend_schema(
        request=ParentLinkInputSerializer, responses={201: ParentLinkSerializer}, summary="Link a parent"
    )
    def post(self, request: Request) -> Response:
        link = container().kinship.link_parent(
            principal_of(request), validated(ParentLinkInputSerializer, request.data)
        )
        return Response(ParentLinkSerializer(link).data, status=status.HTTP_201_CREATED)


class ParentLinkView(WorkspaceApiView):
    @extend_schema(
        request=ParentLinkKindInputSerializer, responses=ParentLinkSerializer, summary="Change link kind"
    )
    def put(self, request: Request, link_id: int) -> Response:
        kind = validated(ParentLinkKindInputSerializer, request.data)
        link = container().kinship.change_parent_link_kind(principal_of(request), ParentLinkId(link_id), kind)
        return Response(ParentLinkSerializer(link).data)

    @extend_schema(responses={204: None}, summary="Remove a parent link")
    def delete(self, request: Request, link_id: int) -> Response:
        container().kinship.unlink_parent(principal_of(request), ParentLinkId(link_id))
        return Response(status=status.HTTP_204_NO_CONTENT)


class PartnershipsView(WorkspaceApiView):
    @extend_schema(
        request=PartnershipInputSerializer, responses={201: PartnershipSerializer}, summary="Add partners"
    )
    def post(self, request: Request) -> Response:
        draft = validated(PartnershipInputSerializer, request.data)
        partnership = container().kinship.add_partnership(principal_of(request), draft)
        return Response(PartnershipSerializer(partnership).data, status=status.HTTP_201_CREATED)


class PartnershipView(WorkspaceApiView):
    @extend_schema(
        request=PartnershipTermsInputSerializer, responses=PartnershipSerializer, summary="Change terms"
    )
    def put(self, request: Request, partnership_id: int) -> Response:
        terms = validated(PartnershipTermsInputSerializer, request.data)
        partnership = container().kinship.change_partnership_terms(
            principal_of(request), PartnershipId(partnership_id), terms
        )
        return Response(PartnershipSerializer(partnership).data)

    @extend_schema(responses={204: None}, summary="Remove a partnership")
    def delete(self, request: Request, partnership_id: int) -> Response:
        container().kinship.remove_partnership(principal_of(request), PartnershipId(partnership_id))
        return Response(status=status.HTTP_204_NO_CONTENT)
