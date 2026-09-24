from contextvars import ContextVar
from dataclasses import dataclass, field
from types import TracebackType
from typing import Self

from django.db import transaction


@dataclass(slots=True)
class _TransactionFrame:
    atomic: transaction.Atomic
    is_committed: bool = field(default=False)


class DjangoUnitOfWork:
    def __init__(self, database_alias: str) -> None:
        self._database = database_alias
        self._frames: ContextVar[tuple[_TransactionFrame, ...]] = ContextVar(
            f"unit_of_work_{database_alias}", default=()
        )

    def __enter__(self) -> Self:
        frame = _TransactionFrame(atomic=transaction.atomic(using=self._database))
        frame.atomic.__enter__()
        self._frames.set((*self._frames.get(), frame))
        return self

    def __exit__(
        self,
        exception_type: type[BaseException] | None,
        exception: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        *outer, frame = self._frames.get()
        self._frames.set(tuple(outer))
        if exception is None and not frame.is_committed:
            transaction.set_rollback(True, using=self._database)
        frame.atomic.__exit__(exception_type, exception, traceback)

    def commit(self) -> None:
        self._frames.get()[-1].is_committed = True
