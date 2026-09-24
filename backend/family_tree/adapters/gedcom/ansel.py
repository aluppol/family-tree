import re
import unicodedata

ANSEL_ENCODING_NAME = "ANSEL"

_SPACING_CHARACTERS = {
    0xA1: "\u0141",
    0xA2: "\u00d8",
    0xA3: "\u0110",
    0xA4: "\u00de",
    0xA5: "\u00c6",
    0xA6: "\u0152",
    0xA7: "\u02b9",
    0xA8: "\u00b7",
    0xA9: "\u266d",
    0xAA: "\u00ae",
    0xAB: "\u00b1",
    0xAC: "\u01a0",
    0xAD: "\u01af",
    0xAE: "\u02bc",
    0xB0: "\u02bb",
    0xB1: "\u0142",
    0xB2: "\u00f8",
    0xB3: "\u0111",
    0xB4: "\u00fe",
    0xB5: "\u00e6",
    0xB6: "\u0153",
    0xB7: "\u02ba",
    0xB8: "\u0131",
    0xB9: "\u00a3",
    0xBA: "\u00f0",
    0xBC: "\u01a1",
    0xBD: "\u01b0",
    0xBE: "\u25a1",
    0xBF: "\u25a0",
    0xC0: "\u00b0",
    0xC1: "\u2113",
    0xC2: "\u2117",
    0xC3: "\u00a9",
    0xC4: "\u266f",
    0xC5: "\u00bf",
    0xC6: "\u00a1",
    0xC7: "\u00df",
    0xC8: "\u20ac",
    0xCD: "\u0065",
    0xCE: "\u006f",
    0xCF: "\u00df",
}

_COMBINING_MARKS = {
    0xE0: "\u0309",
    0xE1: "\u0300",
    0xE2: "\u0301",
    0xE3: "\u0302",
    0xE4: "\u0303",
    0xE5: "\u0304",
    0xE6: "\u0306",
    0xE7: "\u0307",
    0xE8: "\u0308",
    0xE9: "\u030c",
    0xEA: "\u030a",
    0xEB: "\ufe20",
    0xEC: "\ufe21",
    0xED: "\u0315",
    0xEE: "\u030b",
    0xEF: "\u0310",
    0xF0: "\u0327",
    0xF1: "\u0328",
    0xF2: "\u0323",
    0xF3: "\u0324",
    0xF4: "\u0325",
    0xF5: "\u0333",
    0xF6: "\u0332",
    0xF7: "\u0326",
    0xF8: "\u031c",
    0xF9: "\u032e",
    0xFA: "\ufe22",
    0xFB: "\ufe23",
    0xFE: "\u0313",
}

_UNICODE_BY_BYTE = {
    chr(byte): character for byte, character in (_SPACING_CHARACTERS | _COMBINING_MARKS).items()
}
_TRANSLATION = str.maketrans(_UNICODE_BY_BYTE)
_UNMAPPED_BYTES = bytes(byte for byte in range(0x80, 0x100) if chr(byte) not in _UNICODE_BY_BYTE)
_FIRST_UNMAPPED_BYTE = re.compile(b"[" + re.escape(_UNMAPPED_BYTES) + b"]")
_MARKS_BEFORE_BASE = re.compile(rb"([\xe0-\xfe]+)([^\xe0-\xfe\r\n])")


def decode_ansel(encoded: bytes) -> str:
    _require_ansel_bytes(encoded)
    marks_after_base = _MARKS_BEFORE_BASE.sub(rb"\2\1", encoded)
    return unicodedata.normalize("NFC", marks_after_base.decode("latin-1").translate(_TRANSLATION))


def _require_ansel_bytes(encoded: bytes) -> None:
    unmapped = _FIRST_UNMAPPED_BYTE.search(encoded)
    if unmapped is not None:
        position = unmapped.start()
        raise UnicodeDecodeError(
            ANSEL_ENCODING_NAME, encoded, position, position + 1, "not an ANSEL character"
        )
