from collections.abc import Sequence

from family_tree.adapters.gedcom.families import map_families
from family_tree.adapters.gedcom.individuals import map_people
from family_tree.adapters.gedcom.nodes import GedcomFile
from family_tree.adapters.gedcom.photo_sources import PhotoSource
from family_tree.adapters.gedcom.survey import Supported, survey_unsupported
from family_tree.domain.interchange import InterchangeDocument


def map_document(gedcom: GedcomFile, photos: PhotoSource, schema: Sequence[Supported]) -> InterchangeDocument:
    people = map_people(gedcom, photos)
    families = map_families(gedcom)
    return InterchangeDocument(
        people=people.value,
        parent_links=tuple(link for family in families.value for link in family.parent_links),
        partnerships=tuple(family.partnership for family in families.value if family.partnership is not None),
        skipped=(*people.skipped, *families.skipped, *survey_unsupported(gedcom.records, schema)),
    )
