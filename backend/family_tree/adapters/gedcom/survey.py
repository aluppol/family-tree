from collections import Counter
from collections.abc import Callable, Iterator, Sequence
from dataclasses import dataclass

from family_tree.adapters.gedcom.nodes import GedcomNode
from family_tree.adapters.gedcom.vocabulary import describe_omission
from family_tree.domain.interchange import SkippedRecord

_FILE_METADATA_TAGS = frozenset({"HEAD", "TRLR", "SUBM", "SUBN"})
_IGNORED_TAGS = frozenset({"PHRASE", "SUBM", "CHAN", "CREA"})


@dataclass(frozen=True, slots=True)
class Supported:
    tag: str
    children: tuple["Supported", ...] = ()
    applies_to: Callable[[GedcomNode], bool] | None = None


def survey_unsupported(
    records: Sequence[GedcomNode], schema: Sequence[Supported]
) -> tuple[SkippedRecord, ...]:
    content = [record for record in records if record.tag not in _FILE_METADATA_TAGS]
    counts = Counter(_unsupported_paths(content, schema, ""))
    return tuple(
        SkippedRecord(location=path, reason=describe_omission(path, count)) for path, count in counts.items()
    )


def _unsupported_paths(
    nodes: Sequence[GedcomNode], schema: Sequence[Supported], parent_path: str
) -> Iterator[str]:
    for node in nodes:
        path = f"{parent_path}.{node.tag}" if parent_path else node.tag
        entry = next((entry for entry in schema if _supports(entry, node)), None)
        if entry is not None:
            yield from _unsupported_paths(node.children, entry.children, path)
        elif node.tag not in _IGNORED_TAGS:
            yield path


def _supports(entry: Supported, node: GedcomNode) -> bool:
    return entry.tag == node.tag and (entry.applies_to is None or entry.applies_to(node))
