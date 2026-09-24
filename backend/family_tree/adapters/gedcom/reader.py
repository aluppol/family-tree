from family_tree.adapters.gedcom.families import map_families
from family_tree.adapters.gedcom.individuals import map_people
from family_tree.adapters.gedcom.parsing import parse_gedcom
from family_tree.adapters.gedcom.sources import open_source
from family_tree.adapters.gedcom.survey import survey_unsupported
from family_tree.domain.interchange import InterchangeDocument


class GedcomReader:
    def read(self, payload: bytes) -> InterchangeDocument:
        source = open_source(payload)
        gedcom = parse_gedcom(source.gedcom)
        people = map_people(gedcom, source.photos)
        families = map_families(gedcom)
        return InterchangeDocument(
            people=people.value,
            parent_links=tuple(link for family in families.value for link in family.parent_links),
            partnerships=tuple(
                family.partnership for family in families.value if family.partnership is not None
            ),
            skipped=(*people.skipped, *families.skipped, *survey_unsupported(gedcom.records, source.schema)),
        )
