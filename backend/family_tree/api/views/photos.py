import hashlib
from typing import Any

from django.http import HttpResponse
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.parsers import BaseParser
from rest_framework.request import Request
from rest_framework.response import Response

from family_tree.api.authentication import principal_of
from family_tree.api.views.base import WorkspaceApiView
from family_tree.dependencies import container
from family_tree.domain.errors import InvalidInput
from family_tree.domain.identifiers import PersonId
from family_tree.domain.photos import MAX_PHOTO_BYTES, Photo

PHOTO_SECURITY_POLICY = "default-src 'none'; sandbox"
PHOTO_FIELD = "photo"


class ImageBodyParser(BaseParser):
    media_type = "image/*"

    def parse(
        self, stream: Any, _media_type: str | None = None, _parser_context: Any = None
    ) -> dict[str, bytes]:
        content: bytes = stream.read(MAX_PHOTO_BYTES + 1) if stream is not None else b""
        if len(content) > MAX_PHOTO_BYTES:
            raise InvalidInput("photo.too_large", "A photo can be at most 2 MB.")
        return {PHOTO_FIELD: content}


class PersonPhotoView(WorkspaceApiView):
    parser_classes = (ImageBodyParser,)

    @extend_schema(responses={(200, "image/*"): OpenApiTypes.BINARY}, summary="The person's photo")
    def get(self, request: Request, person_id: int) -> HttpResponse:
        photo = container().photos.photo(principal_of(request), PersonId(person_id))
        entity_tag = f'"{hashlib.sha256(photo.content).hexdigest()[:32]}"'
        if request.headers.get("If-None-Match") == entity_tag:
            return HttpResponse(status=status.HTTP_304_NOT_MODIFIED, headers={"ETag": entity_tag})
        return _photo_response(photo, entity_tag)

    @extend_schema(
        request={"image/*": OpenApiTypes.BINARY}, responses={204: None}, summary="Replace the photo"
    )
    def put(self, request: Request, person_id: int) -> Response:
        content: bytes = request.data[PHOTO_FIELD]
        container().photos.replace_photo(principal_of(request), PersonId(person_id), content)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(responses={204: None}, summary="Remove the photo")
    def delete(self, request: Request, person_id: int) -> Response:
        container().photos.remove_photo(principal_of(request), PersonId(person_id))
        return Response(status=status.HTTP_204_NO_CONTENT)


def _photo_response(photo: Photo, entity_tag: str) -> HttpResponse:
    return HttpResponse(
        photo.content,
        content_type=photo.media_type.value,
        headers={
            "ETag": entity_tag,
            "Cache-Control": "private, no-cache",
            "Content-Security-Policy": PHOTO_SECURITY_POLICY,
            "Content-Disposition": "inline",
        },
    )
