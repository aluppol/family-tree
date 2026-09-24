import re
from collections.abc import Callable, Mapping
from functools import partial

from family_tree.adapters.gedcom.ansel import decode_ansel
from family_tree.adapters.gedcom.errors import unreadable
from family_tree.adapters.gedcom.lines import count_lines

type Decoder = Callable[[bytes], str]

_BYTE_ORDER_MARKS = (
    (b"\xef\xbb\xbf", "utf-8-sig"),
    (b"\xff\xfe", "utf-16"),
    (b"\xfe\xff", "utf-16"),
)
_DECODERS_BY_CHARSET: Mapping[str, Decoder] = {
    "UTF-8": partial(bytes.decode, encoding="utf-8"),
    "ASCII": partial(bytes.decode, encoding="ascii"),
    "ANSEL": decode_ansel,
}
_DECLARED_CHARSET = re.compile(rb"^[ \t]*1[ \t]+CHAR[ \t]+([^\r\n]*)", re.MULTILINE)
_DEFAULT_CHARSET = "UTF-8"


def decode_gedcom(encoded: bytes) -> str:
    decoder = _decoder_for(encoded)
    try:
        text = decoder(encoded)
    except UnicodeDecodeError as error:
        line_number = count_lines(decoder(encoded[: error.start]))
        encoding = error.encoding.upper()
        raise unreadable(f"Line {line_number} contains a byte that is not valid {encoding}.") from error
    return text


def _decoder_for(encoded: bytes) -> Decoder:
    for byte_order_mark, codec in _BYTE_ORDER_MARKS:
        if encoded.startswith(byte_order_mark):
            return partial(bytes.decode, encoding=codec)
    charset = _declared_charset(encoded)
    decoder = _DECODERS_BY_CHARSET.get(charset)
    if decoder is None:
        raise unreadable(f"The character set '{charset}' is not supported; save the file as UTF-8.")
    return decoder


def _declared_charset(encoded: bytes) -> str:
    declaration = _DECLARED_CHARSET.search(encoded)
    declared = "" if declaration is None else declaration[1].decode("latin-1").strip().upper()
    return declared or _DEFAULT_CHARSET
