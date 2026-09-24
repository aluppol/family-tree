from family_tree.adapters.gedcom.mapped import Mapped, broken_reference, skipped_at
from family_tree.adapters.gedcom.nodes import VOID_POINTER, GedcomFile, GedcomNode
from family_tree.domain.people import MAX_BIOGRAPHY_LENGTH

NOTE_SEPARATOR = "\n\n"


def map_biography(individual: GedcomNode, key: str, gedcom: GedcomFile) -> Mapped[str]:
    notes = [_note_text(note, key, gedcom) for note in individual.children_tagged("NOTE", "SNOTE")]
    biography = NOTE_SEPARATOR.join(note.value for note in notes if note.value)
    skipped = tuple(record for note in notes for record in note.skipped)
    if len(biography) <= MAX_BIOGRAPHY_LENGTH:
        return Mapped(biography, skipped)
    reason = f"The notes are shortened to {MAX_BIOGRAPHY_LENGTH:,} characters."
    return Mapped(biography[:MAX_BIOGRAPHY_LENGTH], (*skipped, *skipped_at(f"{key} NOTE", reason)))


def _note_text(note: GedcomNode, key: str, gedcom: GedcomFile) -> Mapped[str]:
    if note.pointer is None:
        return Mapped(note.value)
    if note.pointer == VOID_POINTER:
        return Mapped("")
    shared_note = gedcom.resolve(note.pointer, "NOTE", "SNOTE")
    if shared_note is None:
        return Mapped("", broken_reference(f"{key} {note.tag}", note.pointer, "note"))
    return Mapped(shared_note.value)
