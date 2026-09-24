from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response

from family_tree.api.authentication import principal_of
from family_tree.api.dto import (
    CandidateQuerySerializer,
    ChartQuerySerializer,
    FamilyChartSerializer,
    PeoplePageSerializer,
    PeopleQuerySerializer,
    PersonProfileSerializer,
    PersonSerializer,
    PersonSummarySerializer,
    validated,
)
from family_tree.api.views.base import WorkspaceApiView
from family_tree.dependencies import container
from family_tree.domain.identifiers import PersonId
from family_tree.domain.read_models import ChartScope

SEARCH_PARAMETER = OpenApiParameter(
    "search", str, description="Words matched against given names and surname"
)


class PeopleView(WorkspaceApiView):
    @extend_schema(
        parameters=[PeopleQuerySerializer],
        responses=PeoplePageSerializer,
        summary="Search people",
        operation_id="people_search",
    )
    def get(self, request: Request) -> Response:
        query = validated(PeopleQuerySerializer, request.query_params)
        page = container().people.search(principal_of(request), query)
        return Response(PeoplePageSerializer(page, context={"query": query}).data)

    @extend_schema(request=PersonProfileSerializer, responses={201: PersonSerializer}, summary="Add a person")
    def post(self, request: Request) -> Response:
        principal = principal_of(request)
        person = container().people.create(principal, validated(PersonProfileSerializer, request.data))
        dossier = container().people.dossier(principal, person.id)
        return Response(PersonSerializer(dossier).data, status=status.HTTP_201_CREATED)


class PersonView(WorkspaceApiView):
    @extend_schema(responses=PersonSerializer, summary="A person with parents, children and partners")
    def get(self, request: Request, person_id: int) -> Response:
        return Response(
            PersonSerializer(container().people.dossier(principal_of(request), PersonId(person_id))).data
        )

    @extend_schema(request=PersonProfileSerializer, responses=PersonSerializer, summary="Change a person")
    def put(self, request: Request, person_id: int) -> Response:
        principal = principal_of(request)
        profile = validated(PersonProfileSerializer, request.data)
        container().people.update(principal, PersonId(person_id), profile)
        return Response(PersonSerializer(container().people.dossier(principal, PersonId(person_id))).data)

    @extend_schema(responses={204: None}, summary="Delete a person with their links")
    def delete(self, request: Request, person_id: int) -> Response:
        container().people.delete(principal_of(request), PersonId(person_id))
        return Response(status=status.HTTP_204_NO_CONTENT)


class PersonChartView(WorkspaceApiView):
    @extend_schema(
        parameters=[ChartQuerySerializer], responses=FamilyChartSerializer, summary="Hourglass chart"
    )
    def get(self, request: Request, person_id: int) -> Response:
        ancestors, descendants = validated(ChartQuerySerializer, request.query_params)
        scope = ChartScope(
            focus_id=PersonId(person_id), ancestor_generations=ancestors, descendant_generations=descendants
        )
        return Response(FamilyChartSerializer(container().charts.chart(principal_of(request), scope)).data)


class ParentCandidatesView(WorkspaceApiView):
    @extend_schema(parameters=[SEARCH_PARAMETER], responses=PersonSummarySerializer(many=True))
    def get(self, request: Request, person_id: int) -> Response:
        search = validated(CandidateQuerySerializer, request.query_params)
        candidates = container().kinship.parent_candidates(principal_of(request), PersonId(person_id), search)
        return Response([PersonSummarySerializer(candidate).data for candidate in candidates])


class ChildCandidatesView(WorkspaceApiView):
    @extend_schema(parameters=[SEARCH_PARAMETER], responses=PersonSummarySerializer(many=True))
    def get(self, request: Request, person_id: int) -> Response:
        search = validated(CandidateQuerySerializer, request.query_params)
        candidates = container().kinship.child_candidates(principal_of(request), PersonId(person_id), search)
        return Response([PersonSummarySerializer(candidate).data for candidate in candidates])


class PartnerCandidatesView(WorkspaceApiView):
    @extend_schema(parameters=[SEARCH_PARAMETER], responses=PersonSummarySerializer(many=True))
    def get(self, request: Request, person_id: int) -> Response:
        search = validated(CandidateQuerySerializer, request.query_params)
        candidates = container().kinship.partner_candidates(
            principal_of(request), PersonId(person_id), search
        )
        return Response([PersonSummarySerializer(candidate).data for candidate in candidates])
