from family_tree.adapters.demo.bundled import BundledDemoFamily
from family_tree.adapters.gedcom.reader import GedcomReader
from family_tree.domain.import_vetting import vet_document


def test_the_demo_family_opens_on_nicholas_ii_and_passes_every_kinship_rule() -> None:
    document = vet_document(BundledDemoFamily(GedcomReader()).load())
    assert document.people[0].profile.full_name() == "Nicholas Alexandrovich Romanov"
    assert document.skipped == ()
