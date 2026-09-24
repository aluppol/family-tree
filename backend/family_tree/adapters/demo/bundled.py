from pathlib import Path

from family_tree.domain.interchange import InterchangeDocument
from family_tree.domain.ports import InterchangeReader

DEMO_FAMILY_FILE = Path(__file__).with_name("darwin_wedgwood.ged")


class BundledDemoFamily:
    def __init__(self, reader: InterchangeReader) -> None:
        self._reader = reader

    def load(self) -> InterchangeDocument:
        return self._reader.read(DEMO_FAMILY_FILE.read_bytes())
