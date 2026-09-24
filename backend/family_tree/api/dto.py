from collections.abc import Callable
from dataclasses import dataclass
from enum import StrEnum
from typing import Any, cast

from rest_framework import serializers

from family_tree.domain.dates import EARLIEST_YEAR, LAST_MONTH, LATEST_YEAR, CalendarDate, GenealogicalDate
from family_tree.domain.enums import (
    DateQualifier,
    InterchangeFormat,
    ParentLinkKind,
    PartnershipEndReason,
    PartnershipKind,
    Sex,
)
from family_tree.domain.errors import InvalidInput
from family_tree.domain.identifiers import PersonId
from family_tree.domain.interchange import ImportOutcome, ImportReport, SkippedRecord
from family_tree.domain.people import (
    MAX_BIOGRAPHY_LENGTH,
    MAX_NAME_LENGTH,
    MAX_PLACE_LENGTH,
    LifeEvent,
    PersonProfile,
)
from family_tree.domain.read_models import (
    MAX_ANCESTOR_GENERATIONS,
    MAX_DESCENDANT_GENERATIONS,
    MAX_PAGE_SIZE,
    MAX_SEARCH_LENGTH,
    FamilyChart,
    ParentRelation,
    PartnerRelation,
    PeoplePage,
    PeopleQuery,
    PersonDossier,
    PersonSummary,
)
from family_tree.domain.relationships import (
    ParentLink,
    ParentLinkDraft,
    Partnership,
    PartnershipDraft,
    PartnershipEnd,
    PartnershipTerms,
)
from family_tree.domain.workspaces import Principal, WorkspaceOverview

DEFAULT_PAGE_SIZE = 50
DEFAULT_ANCESTOR_GENERATIONS = 4
DEFAULT_DESCENDANT_GENERATIONS = 3


def choices_of(enumeration: type[StrEnum]) -> list[str]:
    return [member.value for member in enumeration]


def validated[Value](serializer_class: type[serializers.Serializer[Value]], payload: object) -> Value:
    serializer = serializer_class(data=payload)
    serializer.is_valid(raise_exception=True)
    return cast("Value", serializer.validated_data)


def domain_value[Value](build: Callable[[], Value]) -> Value:
    try:
        return build()
    except InvalidInput as error:
        detail = {field: list(messages) for field, messages in error.fields.items()} or error.message
        raise serializers.ValidationError(detail) from error


class CalendarDateSerializer(serializers.Serializer[CalendarDate]):
    year = serializers.IntegerField(min_value=EARLIEST_YEAR, max_value=LATEST_YEAR)
    month = serializers.IntegerField(min_value=1, max_value=LAST_MONTH, allow_null=True, default=None)
    day = serializers.IntegerField(min_value=1, max_value=31, allow_null=True, default=None)

    def validate(self, attrs: dict[str, Any]) -> CalendarDate:
        return domain_value(lambda: CalendarDate(**attrs))


class GenealogicalDateSerializer(serializers.Serializer[GenealogicalDate]):
    qualifier = serializers.ChoiceField(choices=choices_of(DateQualifier))
    value = CalendarDateSerializer()
    until = CalendarDateSerializer(allow_null=True, default=None)

    def validate(self, attrs: dict[str, Any]) -> GenealogicalDate:
        qualifier = DateQualifier(attrs["qualifier"])
        return domain_value(lambda: GenealogicalDate(qualifier, attrs["value"], attrs["until"]))


class LifeEventSerializer(serializers.Serializer[LifeEvent]):
    date = GenealogicalDateSerializer(allow_null=True, default=None)
    place = serializers.CharField(max_length=MAX_PLACE_LENGTH, allow_blank=True, default="")

    def validate(self, attrs: dict[str, Any]) -> LifeEvent:
        return domain_value(lambda: LifeEvent(**attrs))


class PersonProfileSerializer(serializers.Serializer[PersonProfile]):
    given_names = serializers.CharField(max_length=MAX_NAME_LENGTH, allow_blank=True, default="")
    surname = serializers.CharField(max_length=MAX_NAME_LENGTH, allow_blank=True, default="")
    sex = serializers.ChoiceField(choices=choices_of(Sex))
    birth = LifeEventSerializer()
    death = LifeEventSerializer(allow_null=True, default=None)
    biography = serializers.CharField(
        max_length=MAX_BIOGRAPHY_LENGTH, allow_blank=True, default="", trim_whitespace=False
    )

    def validate(self, attrs: dict[str, Any]) -> PersonProfile:
        return domain_value(lambda: PersonProfile(**(attrs | {"sex": Sex(attrs["sex"])})))


class PersonSummarySerializer(serializers.Serializer[PersonSummary]):
    id = serializers.IntegerField()
    given_names = serializers.CharField()
    surname = serializers.CharField()
    sex = serializers.ChoiceField(choices=choices_of(Sex))
    birth_date = GenealogicalDateSerializer(allow_null=True)
    death_date = GenealogicalDateSerializer(allow_null=True)
    is_deceased = serializers.BooleanField()
    has_photo = serializers.BooleanField()


class ParentLinkSerializer(serializers.Serializer[ParentLink]):
    id = serializers.IntegerField()
    parent_id = serializers.IntegerField()
    child_id = serializers.IntegerField()
    kind = serializers.ChoiceField(choices=choices_of(ParentLinkKind))


class ParentRelationSerializer(serializers.Serializer[ParentRelation]):
    link_id = serializers.IntegerField(source="link.id")
    kind = serializers.ChoiceField(choices=choices_of(ParentLinkKind), source="link.kind")
    person = PersonSummarySerializer(source="relative")


class PartnershipEndSerializer(serializers.Serializer[PartnershipEnd]):
    reason = serializers.ChoiceField(choices=choices_of(PartnershipEndReason))
    date = GenealogicalDateSerializer(allow_null=True, default=None)

    def validate(self, attrs: dict[str, Any]) -> PartnershipEnd:
        return PartnershipEnd(reason=PartnershipEndReason(attrs["reason"]), date=attrs["date"])


class PartnershipTermsSerializer(serializers.Serializer[PartnershipTerms]):
    kind = serializers.ChoiceField(choices=choices_of(PartnershipKind))
    start = LifeEventSerializer()
    end = PartnershipEndSerializer(allow_null=True, default=None)

    def validate(self, attrs: dict[str, Any]) -> PartnershipTerms:
        return PartnershipTerms(kind=PartnershipKind(attrs["kind"]), start=attrs["start"], end=attrs["end"])


class PartnershipSerializer(serializers.Serializer[Partnership]):
    id = serializers.IntegerField()
    first_partner_id = serializers.IntegerField()
    second_partner_id = serializers.IntegerField()
    terms = PartnershipTermsSerializer()


class PartnerRelationSerializer(serializers.Serializer[PartnerRelation]):
    partnership_id = serializers.IntegerField(source="partnership.id")
    terms = PartnershipTermsSerializer(source="partnership.terms")
    partner = PersonSummarySerializer()


class PersonSerializer(serializers.Serializer[PersonDossier]):
    id = serializers.IntegerField(source="person.id")
    given_names = serializers.CharField(source="person.profile.given_names")
    surname = serializers.CharField(source="person.profile.surname")
    sex = serializers.ChoiceField(choices=choices_of(Sex), source="person.profile.sex")
    birth = LifeEventSerializer(source="person.profile.birth")
    death = LifeEventSerializer(source="person.profile.death", allow_null=True)
    biography = serializers.CharField(source="person.profile.biography")
    has_photo = serializers.BooleanField()
    parents = ParentRelationSerializer(many=True)
    children = ParentRelationSerializer(many=True)
    partnerships = PartnerRelationSerializer(many=True)


class PeoplePageSerializer(serializers.Serializer[PeoplePage]):
    count = serializers.IntegerField(source="total")
    next_offset = serializers.SerializerMethodField()
    results = PersonSummarySerializer(source="people", many=True)

    def get_next_offset(self, page: PeoplePage) -> int | None:
        query: PeopleQuery = self.context["query"]
        end = query.offset + len(page.people)
        return end if end < page.total else None


class FamilyChartSerializer(serializers.Serializer[FamilyChart]):
    focus_id = serializers.IntegerField()
    people = PersonSummarySerializer(many=True)
    parent_links = ParentLinkSerializer(many=True)
    partnerships = PartnershipSerializer(many=True)


class WorkspaceSerializer(serializers.Serializer[WorkspaceOverview]):
    home_person_id = serializers.IntegerField(source="tree.home_person_id", allow_null=True)
    people_count = serializers.IntegerField()
    is_sandbox = serializers.BooleanField(source="tree.is_sandbox")


class ViewerSerializer(serializers.Serializer[Principal]):
    username = serializers.CharField()
    display_name = serializers.CharField()
    is_guest = serializers.BooleanField()


class SkippedRecordSerializer(serializers.Serializer[SkippedRecord]):
    location = serializers.CharField()
    reason = serializers.CharField()


class ImportReportSerializer(serializers.Serializer[ImportReport]):
    people_count = serializers.IntegerField()
    parent_link_count = serializers.IntegerField()
    partnership_count = serializers.IntegerField()
    photo_count = serializers.IntegerField()
    skipped = SkippedRecordSerializer(many=True)


class ImportResultSerializer(serializers.Serializer[ImportOutcome]):
    people_count = serializers.IntegerField(source="report.people_count")
    parent_link_count = serializers.IntegerField(source="report.parent_link_count")
    partnership_count = serializers.IntegerField(source="report.partnership_count")
    photo_count = serializers.IntegerField(source="report.photo_count")
    skipped = SkippedRecordSerializer(source="report.skipped", many=True)
    home_person_id = serializers.IntegerField(allow_null=True)


class ParentLinkInputSerializer(serializers.Serializer[ParentLinkDraft]):
    parent_id = serializers.IntegerField(min_value=1)
    child_id = serializers.IntegerField(min_value=1)
    kind = serializers.ChoiceField(choices=choices_of(ParentLinkKind))

    def validate(self, attrs: dict[str, Any]) -> ParentLinkDraft:
        return ParentLinkDraft(
            parent_id=PersonId(attrs["parent_id"]),
            child_id=PersonId(attrs["child_id"]),
            kind=ParentLinkKind(attrs["kind"]),
        )


class ParentLinkKindInputSerializer(serializers.Serializer[ParentLinkKind]):
    kind = serializers.ChoiceField(choices=choices_of(ParentLinkKind))

    def validate(self, attrs: dict[str, Any]) -> ParentLinkKind:
        return ParentLinkKind(attrs["kind"])


class PartnershipInputSerializer(serializers.Serializer[PartnershipDraft]):
    first_partner_id = serializers.IntegerField(min_value=1)
    second_partner_id = serializers.IntegerField(min_value=1)
    terms = PartnershipTermsSerializer()

    def validate(self, attrs: dict[str, Any]) -> PartnershipDraft:
        return PartnershipDraft(
            first_partner_id=PersonId(attrs["first_partner_id"]),
            second_partner_id=PersonId(attrs["second_partner_id"]),
            terms=attrs["terms"],
        )


class PartnershipTermsInputSerializer(serializers.Serializer[PartnershipTerms]):
    terms = PartnershipTermsSerializer()

    def validate(self, attrs: dict[str, Any]) -> PartnershipTerms:
        terms: PartnershipTerms = attrs["terms"]
        return terms


@dataclass(frozen=True, slots=True)
class HomePersonChoice:
    person_id: PersonId | None


class HomePersonInputSerializer(serializers.Serializer[HomePersonChoice]):
    person_id = serializers.IntegerField(min_value=1, allow_null=True)

    def validate(self, attrs: dict[str, Any]) -> HomePersonChoice:
        person_id = attrs["person_id"]
        return HomePersonChoice(None if person_id is None else PersonId(person_id))


class PeopleQuerySerializer(serializers.Serializer[PeopleQuery]):
    search = serializers.CharField(max_length=MAX_SEARCH_LENGTH, allow_blank=True, default="")
    offset = serializers.IntegerField(min_value=0, default=0)
    limit = serializers.IntegerField(min_value=1, max_value=MAX_PAGE_SIZE, default=DEFAULT_PAGE_SIZE)

    def validate(self, attrs: dict[str, Any]) -> PeopleQuery:
        return domain_value(
            lambda: PeopleQuery(text=attrs["search"], offset=attrs["offset"], limit=attrs["limit"])
        )


class ChartQuerySerializer(serializers.Serializer[tuple[int, int]]):
    ancestors = serializers.IntegerField(
        min_value=0, max_value=MAX_ANCESTOR_GENERATIONS, default=DEFAULT_ANCESTOR_GENERATIONS
    )
    descendants = serializers.IntegerField(
        min_value=0, max_value=MAX_DESCENDANT_GENERATIONS, default=DEFAULT_DESCENDANT_GENERATIONS
    )

    def validate(self, attrs: dict[str, Any]) -> tuple[int, int]:
        return attrs["ancestors"], attrs["descendants"]


class CandidateQuerySerializer(serializers.Serializer[str]):
    search = serializers.CharField(max_length=MAX_SEARCH_LENGTH, allow_blank=True, default="")

    def validate(self, attrs: dict[str, Any]) -> str:
        search: str = attrs["search"]
        return search


class ExportQuerySerializer(serializers.Serializer[InterchangeFormat]):
    format = serializers.ChoiceField(choices=choices_of(InterchangeFormat))

    def validate(self, attrs: dict[str, Any]) -> InterchangeFormat:
        return InterchangeFormat(attrs["format"])


class UploadSerializer(serializers.Serializer[bytes]):
    file = serializers.FileField()
