from django.db import DatabaseError, connections


def is_database_reachable(database_alias: str) -> bool:
    try:
        with connections[database_alias].cursor() as cursor:
            cursor.execute("SELECT 1")
    except DatabaseError:
        return False
    return True
