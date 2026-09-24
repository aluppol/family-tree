from collections.abc import Collection, Mapping

from django.db import connections
from django.db.models import Q, QuerySet

from family_tree.adapters.persistence.mappers import ParentLinkMapper, PartnershipMapper
from family_tree.adapters.persistence.models import ParentLinkRecord, PartnershipRecord, PersonRecord
from family_tree.adapters.persistence.summaries import NAME_ORDER, name_matches, summaries_of
from family_tree.domain.identifiers import PersonId, TreeId
from family_tree.domain.read_models import ChartScope, FamilyChart, PersonSummary
from family_tree.domain.relationships import ParentLink, Partnership

CANDIDATE_LIMIT = 20

LINEAGE_SQL = """
WITH RECURSIVE ancestry(person_id, generation) AS (
    SELECT %(focus)s::bigint, 0
    UNION
    SELECT link.parent_id, ancestry.generation + 1
    FROM parent_link AS link JOIN ancestry ON link.child_id = ancestry.person_id
    WHERE link.tree_id = %(tree)s AND ancestry.generation < %(ancestors)s
),
descent(person_id, generation) AS (
    SELECT %(focus)s::bigint, 0
    UNION
    SELECT link.child_id, descent.generation + 1
    FROM parent_link AS link JOIN descent ON link.parent_id = descent.person_id
    WHERE link.tree_id = %(tree)s AND descent.generation < %(descendants)s
)
SELECT 'ancestor', person_id FROM ancestry WHERE generation > 0
UNION
SELECT 'descendant', person_id FROM descent
"""

ANCESTOR_IDS_SQL = """
WITH RECURSIVE ancestry(person_id) AS (
    SELECT %(person)s::bigint
    UNION
    SELECT link.parent_id FROM parent_link AS link JOIN ancestry ON link.child_id = ancestry.person_id
    WHERE link.tree_id = %(tree)s
)
SELECT person_id FROM ancestry
"""

DESCENDANT_IDS_SQL = """
WITH RECURSIVE descent(person_id) AS (
    SELECT %(person)s::bigint
    UNION
    SELECT link.child_id FROM parent_link AS link JOIN descent ON link.parent_id = descent.person_id
    WHERE link.tree_id = %(tree)s
)
SELECT person_id FROM descent
"""


class PostgresKinshipGraph:
    def __init__(self, database_alias: str) -> None:
        self._database = database_alias

    def is_ancestor(self, tree_id: TreeId, ancestor_id: PersonId, descendant_id: PersonId) -> bool:
        ancestors = self._ids(ANCESTOR_IDS_SQL, {"tree": tree_id, "person": descendant_id})
        return ancestor_id != descendant_id and ancestor_id in ancestors

    def chart(self, tree_id: TreeId, scope: ChartScope) -> FamilyChart:
        ancestors, lineage = self._lineage(tree_id, scope)
        partnerships = self._chart_partnerships(tree_id, ancestors, lineage)
        partner_ids = {partnership.first_partner_id for partnership in partnerships}
        partner_ids |= {partnership.second_partner_id for partnership in partnerships}
        people_ids = ancestors | lineage | partner_ids
        return FamilyChart(
            focus_id=scope.focus_id,
            people=tuple(summaries_of(self._people(tree_id).filter(id__in=people_ids).order_by("id"))),
            parent_links=tuple(self._links_among(tree_id, people_ids)),
            partnerships=tuple(partnerships),
        )

    def parent_candidates(self, tree_id: TreeId, child_id: PersonId, text: str) -> list[PersonSummary]:
        descendants = self._ids(DESCENDANT_IDS_SQL, {"tree": tree_id, "person": child_id})
        parents = ParentLinkRecord.objects.using(self._database).filter(tree_id=tree_id, child_id=child_id)
        return self._candidates(tree_id, text, descendants | set(parents.values_list("parent_id", flat=True)))

    def child_candidates(self, tree_id: TreeId, parent_id: PersonId, text: str) -> list[PersonSummary]:
        ancestors = self._ids(ANCESTOR_IDS_SQL, {"tree": tree_id, "person": parent_id})
        children = ParentLinkRecord.objects.using(self._database).filter(tree_id=tree_id, parent_id=parent_id)
        return self._candidates(tree_id, text, ancestors | set(children.values_list("child_id", flat=True)))

    def partner_candidates(self, tree_id: TreeId, person_id: PersonId, text: str) -> list[PersonSummary]:
        return self._candidates(tree_id, text, {person_id})

    def _lineage(self, tree_id: TreeId, scope: ChartScope) -> tuple[set[PersonId], set[PersonId]]:
        parameters = {
            "tree": tree_id,
            "focus": scope.focus_id,
            "ancestors": scope.ancestor_generations,
            "descendants": scope.descendant_generations,
        }
        with connections[self._database].cursor() as cursor:
            cursor.execute(LINEAGE_SQL, parameters)
            rows = cursor.fetchall()
        ancestors = {PersonId(person_id) for side, person_id in rows if side == "ancestor"}
        return ancestors, {PersonId(person_id) for side, person_id in rows if side == "descendant"}

    def _chart_partnerships(
        self, tree_id: TreeId, ancestors: Collection[PersonId], lineage: Collection[PersonId]
    ) -> list[Partnership]:
        involving_lineage = Q(first_partner_id__in=lineage) | Q(second_partner_id__in=lineage)
        between_ancestors = Q(first_partner_id__in=ancestors) & Q(second_partner_id__in=ancestors)
        records = PartnershipRecord.objects.using(self._database).filter(tree_id=tree_id)
        ordered = records.filter(involving_lineage | between_ancestors).order_by("start_sort_date", "id")
        return [PartnershipMapper.to_entity(record) for record in ordered]

    def _links_among(self, tree_id: TreeId, people_ids: Collection[PersonId]) -> list[ParentLink]:
        records = ParentLinkRecord.objects.using(self._database).filter(
            tree_id=tree_id, parent_id__in=people_ids, child_id__in=people_ids
        )
        return [ParentLinkMapper.to_entity(record) for record in records.order_by("id")]

    def _candidates(self, tree_id: TreeId, text: str, excluded: Collection[int]) -> list[PersonSummary]:
        matching = self._people(tree_id).exclude(id__in=excluded).filter(name_matches(text))
        return summaries_of(matching.order_by(*NAME_ORDER)[:CANDIDATE_LIMIT])

    def _people(self, tree_id: TreeId) -> QuerySet[PersonRecord]:
        return PersonRecord.objects.using(self._database).filter(tree_id=tree_id)

    def _ids(self, sql: str, parameters: Mapping[str, int]) -> set[PersonId]:
        with connections[self._database].cursor() as cursor:
            cursor.execute(sql, parameters)
            return {PersonId(person_id) for (person_id,) in cursor.fetchall()}
