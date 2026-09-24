from dataclasses import dataclass

from family_tree.domain.enums import PhotoType
from family_tree.domain.errors import InvalidInput

MAX_PHOTO_BYTES = 2 * 1024 * 1024
JPEG_SIGNATURE = b"\xff\xd8\xff"
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


@dataclass(frozen=True, slots=True)
class Photo:
    media_type: PhotoType
    content: bytes


def photo_from_bytes(content: bytes) -> Photo:
    if len(content) > MAX_PHOTO_BYTES:
        raise InvalidInput("photo.too_large", "A photo can be at most 2 MB.")
    return Photo(detect_photo_type(content), content)


def detect_photo_type(content: bytes) -> PhotoType:
    if content.startswith(JPEG_SIGNATURE):
        return PhotoType.JPEG
    if content.startswith(PNG_SIGNATURE):
        return PhotoType.PNG
    if content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return PhotoType.WEBP
    raise InvalidInput("photo.unsupported_type", "A photo must be a JPEG, PNG or WebP image.")
