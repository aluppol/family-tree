import operator
from collections.abc import Iterable
from functools import reduce

from django.db.models import Exists, OuterRef, Q, QuerySet

from family_tree.adapters.persistence.mappers import SUMMARY_COLUMNS, PersonMapper
from family_tree.adapters.persistence.models import PersonPhotoRecord, PersonRecord
from family_tree.domain.read_models import PersonSummary

NAME_ORDER = ("surname", "given_names", "id")


def summaries_of(records: QuerySet[PersonRecord]) -> list[PersonSummary]:
    rows = records.annotate(has_photo=Exists(PersonPhotoRecord.objects.filter(person=OuterRef("pk"))))
    return [PersonMapper.summary_from_row(row) for row in rows.values(*SUMMARY_COLUMNS, "has_photo")]


def name_matches(text: str) -> Q:
    words: Iterable[str] = text.split()
    return reduce(
        operator.and_,
        (Q(given_names__icontains=word) | Q(surname__icontains=word) for word in words),
        Q(),
    )
