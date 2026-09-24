_PHOTOS_NEED_GEDZIP = "Photos need a GEDZIP file."

_EXPLANATIONS_BY_PATH = {
    "OBJE": _PHOTOS_NEED_GEDZIP,
    "INDI.OBJE": _PHOTOS_NEED_GEDZIP,
}

_NOUNS_BY_PATH = {
    "OBJE": "media record",
    "REPO": "repository record",
    "SOUR": "source record",
    "FAM.EVEN": "other family event",
    "FAM.MARR.HUSB": "husband's age",
    "FAM.MARR.WIFE": "wife's age",
    "FAM.NOTE": "family note",
    "INDI.EVEN": "custom event",
    "INDI.NAME.TYPE": "name type",
    "INDI.OBJE": "photo",
    "INDI.TITL": "nobility title",
}

_NOUNS_BY_TAG = {
    "ADDR": "address",
    "ADOP": "adoption fact",
    "AFN": "ancestral file number",
    "AGE": "age",
    "AGNC": "agency",
    "ALIA": "alias",
    "ANCI": "research interest",
    "ASSO": "association",
    "BAPL": "LDS ordinance",
    "BAPM": "baptism fact",
    "BARM": "bar mitzvah fact",
    "BASM": "bat mitzvah fact",
    "BLES": "blessing fact",
    "BURI": "burial fact",
    "CAST": "caste fact",
    "CAUS": "cause",
    "CENS": "census fact",
    "CHR": "christening fact",
    "CHRA": "adult christening fact",
    "CONF": "confirmation fact",
    "CONL": "LDS ordinance",
    "CREM": "cremation fact",
    "DESI": "research interest",
    "DIVF": "divorce filing",
    "DSCR": "physical description",
    "EDUC": "education fact",
    "EMAIL": "email address",
    "EMIG": "emigration fact",
    "ENDL": "LDS ordinance",
    "ENGA": "engagement",
    "EXID": "external identifier",
    "FACT": "custom fact",
    "FCOM": "first communion fact",
    "FONE": "phonetic variant",
    "GRAD": "graduation fact",
    "IDNO": "identity number",
    "IMMI": "immigration fact",
    "INIL": "LDS ordinance",
    "LANG": "language",
    "MAP": "map coordinate",
    "MARB": "marriage bann",
    "MARC": "marriage contract",
    "MARL": "marriage license",
    "MARS": "marriage settlement",
    "NATI": "nationality fact",
    "NATU": "naturalization fact",
    "NCHI": "children count",
    "NICK": "nickname",
    "NMR": "marriage count",
    "NO": "negative assertion",
    "NOTE": "note",
    "NPFX": "name prefix",
    "OBJE": "media link",
    "OCCU": "occupation fact",
    "ORDN": "ordination fact",
    "PHON": "phone number",
    "PLAC": "place",
    "PROB": "probate fact",
    "PROP": "property fact",
    "REFN": "reference number",
    "RELI": "religion fact",
    "RESI": "residence fact",
    "RESN": "restriction notice",
    "RETI": "retirement fact",
    "RFN": "record file number",
    "RIN": "record number",
    "ROMN": "romanized variant",
    "SDATE": "sort date",
    "SLGC": "LDS ordinance",
    "SLGS": "LDS ordinance",
    "SNOTE": "note",
    "SOUR": "source citation",
    "SSN": "social security number",
    "STAT": "status",
    "TIME": "time",
    "TITL": "title",
    "TRAN": "translation",
    "TYPE": "event type",
    "UID": "unique identifier",
    "WILL": "will",
    "WWW": "web address",
    "_UID": "unique identifier",
}


def describe_omission(path: str, count: int) -> str:
    noun = _noun_for(path)
    counted = f"1 {noun} is" if count == 1 else f"{count:,} {_plural(noun)} are"
    explanation = _EXPLANATIONS_BY_PATH.get(path)
    sentence = f"{counted} not imported."
    return sentence if explanation is None else f"{sentence} {explanation}"


def _noun_for(path: str) -> str:
    tag = path.rpartition(".")[2]
    fallback = f"custom {tag} entry" if tag.startswith("_") else f"{tag} entry"
    return _NOUNS_BY_PATH.get(path) or _NOUNS_BY_TAG.get(tag) or fallback


def _plural(noun: str) -> str:
    if noun.endswith("s"):
        return f"{noun}es"
    if noun.endswith("y"):
        return f"{noun[:-1]}ies"
    return f"{noun}s"
