import threading
from collections.abc import Callable, Iterator
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager

from django.db import connections

from family_tree.adapters.persistence.unit_of_work import DjangoUnitOfWork

DATABASE = "default"
WAIT_SECONDS = 10
STILL_WAITING_SECONDS = 0.5


@contextmanager
def held_open(step: Callable[[], object]) -> Iterator[None]:
    started, finish = threading.Event(), threading.Event()

    def hold() -> None:
        unit_of_work = DjangoUnitOfWork(DATABASE)
        try:
            with unit_of_work:
                step()
                started.set()
                finish.wait(WAIT_SECONDS)
                unit_of_work.commit()
        finally:
            connections[DATABASE].close()

    with ThreadPoolExecutor(max_workers=1) as holder:
        holding = holder.submit(hold)
        try:
            assert started.wait(WAIT_SECONDS)
            yield
        finally:
            finish.set()
        holding.result(timeout=WAIT_SECONDS)


def run_and_commit(step: Callable[[], object]) -> None:
    unit_of_work = DjangoUnitOfWork(DATABASE)
    try:
        with unit_of_work:
            step()
            unit_of_work.commit()
    finally:
        connections[DATABASE].close()


def run_and_close[Result](step: Callable[[], Result]) -> Result:
    try:
        return step()
    finally:
        connections[DATABASE].close()
