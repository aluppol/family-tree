from collections.abc import Mapping, Sequence
from types import MappingProxyType


class DomainError(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


class InvalidInput(DomainError):
    def __init__(self, code: str, message: str, fields: Mapping[str, Sequence[str]] | None = None) -> None:
        super().__init__(code, message)
        self.fields: Mapping[str, Sequence[str]] = MappingProxyType(dict(fields or {}))


class RuleViolation(DomainError):
    pass


class NotFound(DomainError):
    pass


class AccessDenied(DomainError):
    pass


class Unauthenticated(DomainError):
    pass


class IdentityUnavailable(DomainError):
    pass


class WorkspaceAlreadyExists(DomainError):
    pass
