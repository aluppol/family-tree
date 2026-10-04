from collections.abc import Mapping
from types import MappingProxyType

from django.db import connections

from family_tree.domain.enums import UsageMeasure
from family_tree.domain.identifiers import TreeId

USAGE_SQL: Mapping[UsageMeasure, str] = MappingProxyType(
    {
        UsageMeasure.PEOPLE: "SELECT count(*) FROM person WHERE tree_id = %(tree)s",
        UsageMeasure.RELATIONSHIPS: """
SELECT (SELECT count(*) FROM parent_link WHERE tree_id = %(tree)s)
     + (SELECT count(*) FROM partnership WHERE tree_id = %(tree)s)
""",
        UsageMeasure.STORED_BYTES: """
SELECT (SELECT coalesce(sum(pg_column_size(person.*)), 0) FROM person WHERE tree_id = %(tree)s)
     + (SELECT coalesce(sum(pg_column_size(parent_link.*)), 0) FROM parent_link WHERE tree_id = %(tree)s)
     + (SELECT coalesce(sum(pg_column_size(partnership.*)), 0) FROM partnership WHERE tree_id = %(tree)s)
     + (SELECT coalesce(sum(pg_column_size(content)), 0) FROM person_photo WHERE tree_id = %(tree)s)
""",
    }
)


class PostgresWorkspaceMeter:
    def __init__(self, database_alias: str) -> None:
        self._database = database_alias

    def usage(self, tree_id: TreeId, measure: UsageMeasure) -> int:
        with connections[self._database].cursor() as cursor:
            cursor.execute(USAGE_SQL[measure], {"tree": tree_id})
            [(amount,)] = cursor.fetchall()
        return int(amount)
