from dataclasses import replace

from family_tree.adapters.gedcom.biography import map_biography
from family_tree.adapters.gedcom.events import latest_bound_before, map_life_event
from family_tree.adapters.gedcom.mapped import Mapped, repeated_identifier
from family_tree.adapters.gedcom.names import map_name
from family_tree.adapters.gedcom.nodes import GedcomFile, GedcomNode
from family_tree.adapters.gedcom.photo_sources import PhotoSource
from family_tree.domain.enums import Sex
from family_tree.domain.interchange import InterchangePerson
from family_tree.domain.people import LifeEvent, PersonProfile

_SEX_BY_CODE = {"M": Sex.MALE, "F": Sex.FEMALE, "X": Sex.OTHER}


def map_people(gedcom: GedcomFile, photos: PhotoSource) -> Mapped[tuple[InterchangePerson, ...]]:
    people = [map_individual(individual, gedcom, photos) for individual in gedcom.distinct_records("INDI")]
    repeated = tuple(repeated_identifier(record) for record in gedcom.repeated_records("INDI"))
    skipped = tuple(record for person in people for record in person.skipped)
    return Mapped(tuple(person.value for person in people), (*skipped, *repeated))


def map_individual(
    individual: GedcomNode, gedcom: GedcomFile, photos: PhotoSource
) -> Mapped[InterchangePerson]:
    key = individual.reference()
    name = map_name(individual, key)
    birth = _map_birth(individual, key)
    death = _map_death(individual, key)
    biography = map_biography(individual, key, gedcom)
    photo = photos.photo_of(individual, gedcom)
    profile = PersonProfile(
        given_names=name.value.given_names,
        surname=name.value.surname,
        sex=_SEX_BY_CODE.get(individual.child_text("SEX").strip().upper(), Sex.UNKNOWN),
        birth=birth.value,
        death=death.value,
        biography=biography.value,
    )
    skipped = (*name.skipped, *birth.skipped, *death.skipped, *biography.skipped, *photo.skipped)
    return Mapped(InterchangePerson(key=key, profile=profile, photo=photo.value), skipped)


def _map_birth(individual: GedcomNode, key: str) -> Mapped[LifeEvent]:
    birth = map_life_event(individual.first_child("BIRT"), f"{key} BIRT")
    if birth.value.date is not None:
        return birth
    baptism_bound = latest_bound_before(individual.children_tagged("CHR", "BAPM"))
    return Mapped(replace(birth.value, date=baptism_bound), birth.skipped)


def _map_death(individual: GedcomNode, key: str) -> Mapped[LifeEvent | None]:
    death_event = individual.first_child("DEAT")
    burials = individual.children_tagged("BURI", "CREM")
    if death_event is None and not burials:
        return Mapped(None)
    death = map_life_event(death_event, f"{key} DEAT")
    if death.value.date is not None:
        return Mapped(death.value, death.skipped)
    return Mapped(replace(death.value, date=latest_bound_before(burials)), death.skipped)
