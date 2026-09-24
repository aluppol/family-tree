from enum import StrEnum


class DateQualifier(StrEnum):
    EXACT = "exact"
    ABOUT = "about"
    CALCULATED = "calculated"
    ESTIMATED = "estimated"
    BEFORE = "before"
    AFTER = "after"
    BETWEEN = "between"


class Sex(StrEnum):
    FEMALE = "female"
    MALE = "male"
    OTHER = "other"
    UNKNOWN = "unknown"


class ParentLinkKind(StrEnum):
    BIRTH = "birth"
    ADOPTED = "adopted"
    FOSTER = "foster"
    OTHER = "other"


class PartnershipKind(StrEnum):
    MARRIAGE = "marriage"
    PARTNERSHIP = "partnership"


class PartnershipEndReason(StrEnum):
    DIVORCE = "divorce"
    ANNULMENT = "annulment"
    SEPARATION = "separation"


class OwnerKind(StrEnum):
    MEMBER = "member"
    GUEST = "guest"


class Role(StrEnum):
    USER = "USER"
    ADMIN = "ADMIN"
    GUEST = "guest"


class PhotoType(StrEnum):
    JPEG = "image/jpeg"
    PNG = "image/png"
    WEBP = "image/webp"


class InterchangeFormat(StrEnum):
    GEDCOM_551 = "gedcom-5.5.1"
    GEDCOM_7 = "gedcom-7.0"
    GEDZIP = "gedzip"
