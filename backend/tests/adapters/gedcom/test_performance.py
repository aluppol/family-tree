import sys
import time
import timeit
from collections.abc import Callable

import pytest

from family_tree.adapters.gedcom.gedcom7_writer import Gedcom7Writer
from family_tree.adapters.gedcom.gedcom551_writer import Gedcom551Writer
from family_tree.adapters.gedcom.gedzip_writer import GedzipWriter
from family_tree.adapters.gedcom.reader import GedcomReader
from family_tree.domain.enums import InterchangeFormat
from family_tree.domain.interchange import TreeSnapshot
from family_tree.domain.ports import InterchangeWriter
from tests.adapters.gedcom.samples import random_snapshot

PEOPLE = 5_000
TIME_LIMIT_SECONDS = 5.0
ATTEMPTS = 3
WRITERS = [Gedcom551Writer(), Gedcom7Writer(), GedzipWriter()]

pytestmark = pytest.mark.skipif(
    sys.gettrace() is not None, reason="Timings are meaningless while a tracer such as coverage is running."
)


@pytest.fixture(scope="module")
def large_tree() -> TreeSnapshot:
    return random_snapshot(seed=2026, size=PEOPLE)


@pytest.mark.parametrize("writer", WRITERS, ids=list(InterchangeFormat))
def test_writing_five_thousand_people_takes_under_five_seconds(
    writer: InterchangeWriter, large_tree: TreeSnapshot
) -> None:
    assert _fastest_seconds(lambda: writer.write(large_tree)) < TIME_LIMIT_SECONDS


@pytest.mark.parametrize("writer", WRITERS, ids=list(InterchangeFormat))
def test_reading_five_thousand_people_takes_under_five_seconds(
    writer: InterchangeWriter, large_tree: TreeSnapshot
) -> None:
    payload = writer.write(large_tree)
    assert len(GedcomReader().read(payload).people) == PEOPLE
    assert _fastest_seconds(lambda: GedcomReader().read(payload)) < TIME_LIMIT_SECONDS


def _fastest_seconds(action: Callable[[], object]) -> float:
    return min(timeit.repeat(action, timer=time.process_time, number=1, repeat=ATTEMPTS))
