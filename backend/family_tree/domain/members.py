from dataclasses import dataclass
from datetime import datetime

from family_tree.domain.errors import InvalidInput


@dataclass(frozen=True, slots=True)
class InactivityPeriod:
    days: int

    def __post_init__(self) -> None:
        if self.days < 1:
            raise InvalidInput("members.period_too_short", "An inactivity period is at least one day.")


@dataclass(frozen=True, slots=True, kw_only=True)
class MemberActivity:
    subject: str
    last_active_at: datetime
