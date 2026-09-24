from family_tree.adapters.gedcom.family_events import is_partnership_start, is_separation
from family_tree.adapters.gedcom.survey import Supported

_DATE = Supported("DATE")
_DATED_EVENT = (_DATE,)
_LIFE_EVENT = (_DATE, Supported("PLAC"))
_NAME = Supported("NAME", (Supported("GIVN"), Supported("SURN"), Supported("SPFX"), Supported("NSFX")))
_NOTES = (Supported("NOTE"), Supported("SNOTE"))
_INDIVIDUAL = (
    _NAME,
    Supported("SEX"),
    Supported("BIRT", _LIFE_EVENT),
    Supported("DEAT", _LIFE_EVENT),
    *_NOTES,
    Supported("FAMC", (Supported("PEDI"),)),
    Supported("FAMS"),
)
_FAMILY = Supported(
    "FAM",
    (
        Supported("HUSB"),
        Supported("WIFE"),
        Supported("CHIL"),
        Supported("MARR", _LIFE_EVENT),
        Supported("DIV", _DATED_EVENT),
        Supported("ANUL", _DATED_EVENT),
        Supported("EVEN", (Supported("TYPE"), *_DATED_EVENT), is_separation),
        Supported("EVEN", (Supported("TYPE"), *_LIFE_EVENT), is_partnership_start),
    ),
)
_MEDIA_FORMAT = Supported("FORM", (Supported("TYPE"), Supported("MEDI")))
_MEDIA = (Supported("FILE", (_MEDIA_FORMAT,)), _MEDIA_FORMAT)

PLAIN_TEXT_SCHEMA = (Supported("INDI", _INDIVIDUAL), _FAMILY, *_NOTES)
GEDZIP_SCHEMA = (
    Supported("INDI", (*_INDIVIDUAL, Supported("OBJE", _MEDIA))),
    _FAMILY,
    *_NOTES,
    Supported("OBJE", _MEDIA),
)
