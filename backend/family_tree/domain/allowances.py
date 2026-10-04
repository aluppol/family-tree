from collections.abc import Callable, Mapping
from dataclasses import dataclass
from types import MappingProxyType

from family_tree.domain.enums import OwnerKind, UsageMeasure
from family_tree.domain.errors import InvalidInput, RuleViolation
from family_tree.domain.interchange import InterchangeDocument

MEGABYTE = 1024 * 1024
QUANTITY_PHRASES: Mapping[UsageMeasure, Callable[[int], str]] = MappingProxyType(
    {
        UsageMeasure.PEOPLE: lambda people: f"{people:,} people",
        UsageMeasure.RELATIONSHIPS: lambda relationships: f"{relationships:,} parent links and partnerships",
        UsageMeasure.STORED_BYTES: lambda stored_bytes: (
            f"{stored_bytes / MEGABYTE:g} MB of family data and photos"
        ),
    }
)

type WorkspaceUsage = Mapping[UsageMeasure, int]


@dataclass(frozen=True, slots=True, kw_only=True)
class WorkspaceAllowance:
    workspace_phrase: str
    ceilings: Mapping[UsageMeasure, int]
    largest_upload_bytes: int


MEMBER_ALLOWANCE = WorkspaceAllowance(
    workspace_phrase="A family tree here",
    ceilings=MappingProxyType({UsageMeasure.PEOPLE: 50_000}),
    largest_upload_bytes=20 * MEGABYTE,
)
GUEST_ALLOWANCE = WorkspaceAllowance(
    workspace_phrase="The demo sandbox",
    ceilings=MappingProxyType(
        {
            UsageMeasure.PEOPLE: 300,
            UsageMeasure.RELATIONSHIPS: 1_500,
            UsageMeasure.STORED_BYTES: 5 * MEGABYTE // 2,
        }
    ),
    largest_upload_bytes=2 * MEGABYTE,
)
ALLOWANCES: Mapping[OwnerKind, WorkspaceAllowance] = MappingProxyType(
    {OwnerKind.MEMBER: MEMBER_ALLOWANCE, OwnerKind.GUEST: GUEST_ALLOWANCE}
)


def allowance_of(owner_kind: OwnerKind) -> WorkspaceAllowance:
    return ALLOWANCES[owner_kind]


def usage_of_document(document: InterchangeDocument) -> WorkspaceUsage:
    photos = (person.photo for person in document.people if person.photo is not None)
    return {
        UsageMeasure.PEOPLE: len(document.people),
        UsageMeasure.RELATIONSHIPS: len(document.parent_links) + len(document.partnerships),
        UsageMeasure.STORED_BYTES: sum(len(photo.content) for photo in photos),
    }


def usage_with(usage: WorkspaceUsage, addition: WorkspaceUsage) -> WorkspaceUsage:
    return {measure: amount + addition[measure] for measure, amount in usage.items()}


def ensure_usage_allowed(allowance: WorkspaceAllowance, usage: WorkspaceUsage) -> None:
    violation = find_usage_violation(allowance, usage)
    if violation is not None:
        raise violation


def find_usage_violation(allowance: WorkspaceAllowance, usage: WorkspaceUsage) -> RuleViolation | None:
    exceeded = (measure for measure, ceiling in allowance.ceilings.items() if usage[measure] > ceiling)
    measure = next(exceeded, None)
    return None if measure is None else _limit_reached(allowance, measure)


def ensure_upload_allowed(allowance: WorkspaceAllowance, upload_bytes: int) -> None:
    if upload_bytes > allowance.largest_upload_bytes:
        largest = f"{allowance.largest_upload_bytes / MEGABYTE:g} MB"
        raise InvalidInput("gedcom.too_large", f"The file is larger than {largest}.")


def _limit_reached(allowance: WorkspaceAllowance, measure: UsageMeasure) -> RuleViolation:
    quantity = QUANTITY_PHRASES[measure](allowance.ceilings[measure])
    return RuleViolation("workspace.limit_reached", f"{allowance.workspace_phrase} holds at most {quantity}.")
