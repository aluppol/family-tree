from dataclasses import dataclass

from family_tree.adapters.gedcom.mapped import Mapped, broken_reference, repeated_identifier
from family_tree.adapters.gedcom.nodes import VOID_POINTER, GedcomFile, GedcomNode
from family_tree.adapters.gedcom.partnership_terms import map_partnership_terms
from family_tree.domain.enums import ParentLinkKind
from family_tree.domain.interchange import InterchangeParentLink, InterchangePartnership

_KIND_BY_PEDIGREE = {
    "BIRTH": ParentLinkKind.BIRTH,
    "ADOPTED": ParentLinkKind.ADOPTED,
    "FOSTER": ParentLinkKind.FOSTER,
}


@dataclass(frozen=True, slots=True, kw_only=True)
class FamilyLinks:
    partnership: InterchangePartnership | None
    parent_links: tuple[InterchangeParentLink, ...]


def map_families(gedcom: GedcomFile) -> Mapped[tuple[FamilyLinks, ...]]:
    families = [map_family(family, gedcom) for family in gedcom.distinct_records("FAM")]
    repeated = tuple(repeated_identifier(record) for record in gedcom.repeated_records("FAM"))
    skipped = tuple(record for family in families for record in family.skipped)
    return Mapped(tuple(family.value for family in families), (*skipped, *repeated))


def map_family(family: GedcomNode, gedcom: GedcomFile) -> Mapped[FamilyLinks]:
    partners = _members(family, ("HUSB", "WIFE"), gedcom)
    children = _members(family, ("CHIL",), gedcom)
    partnership = _partnership(family, partners.value)
    parent_links = tuple(
        InterchangeParentLink(parent_key=parent, child_key=child, kind=_pedigree(family, child, gedcom))
        for child in children.value
        for parent in partners.value
    )
    links = FamilyLinks(partnership=partnership.value, parent_links=parent_links)
    return Mapped(links, (*partners.skipped, *children.skipped, *partnership.skipped))


def _members(family: GedcomNode, tags: tuple[str, ...], gedcom: GedcomFile) -> Mapped[tuple[str, ...]]:
    members = [_member(family, reference, gedcom) for reference in family.children_tagged(*tags)]
    keys = dict.fromkeys(member.value for member in members if member.value is not None)
    return Mapped(tuple(keys), tuple(record for member in members for record in member.skipped))


def _member(family: GedcomNode, reference: GedcomNode, gedcom: GedcomFile) -> Mapped[str | None]:
    if reference.pointer == VOID_POINTER:
        return Mapped(None)
    person = None if reference.pointer is None else gedcom.resolve(reference.pointer, "INDI")
    if person is None:
        location = f"{family.reference()} {reference.tag}"
        return Mapped(None, broken_reference(location, reference.pointer or f"'{reference.value}'", "person"))
    return Mapped(person.reference())


def _partnership(family: GedcomNode, partner_keys: tuple[str, ...]) -> Mapped[InterchangePartnership | None]:
    if len(partner_keys) != 2:
        return Mapped(None)
    terms = map_partnership_terms(family, family.reference())
    first, second = partner_keys
    partnership = InterchangePartnership(
        first_partner_key=first, second_partner_key=second, terms=terms.value
    )
    return Mapped(partnership, terms.skipped)


def _pedigree(family: GedcomNode, child_key: str, gedcom: GedcomFile) -> ParentLinkKind:
    child = gedcom.records_by_xref[child_key]
    links = child.children_tagged("FAMC")
    link = next((link for link in links if link.pointer is not None and link.pointer == family.xref), None)
    code = "" if link is None else link.child_text("PEDI").strip().upper()
    if not code:
        return ParentLinkKind.BIRTH
    return _KIND_BY_PEDIGREE.get(code, ParentLinkKind.OTHER)
