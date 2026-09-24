from collections.abc import Mapping

from django.core.files.uploadedfile import UploadedFile
from django.http import HttpResponse
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.parsers import MultiPartParser
from rest_framework.request import Request
from rest_framework.response import Response

from family_tree.api.authentication import principal_of
from family_tree.api.dto import (
    ExportQuerySerializer,
    ImportReportSerializer,
    ImportResultSerializer,
    UploadSerializer,
    validated,
)
from family_tree.api.views.base import WorkspaceApiView
from family_tree.dependencies import container
from family_tree.domain.enums import InterchangeFormat
from family_tree.domain.errors import InvalidInput

MAX_UPLOAD_BYTES = 20 * 1024 * 1024
TOO_LARGE = "The file is larger than 20 MB."
DOWNLOADS: Mapping[InterchangeFormat, tuple[str, str]] = {
    InterchangeFormat.GEDCOM_551: ("family-tree.ged", "text/plain; charset=utf-8"),
    InterchangeFormat.GEDCOM_7: ("family-tree.ged", "text/plain; charset=utf-8"),
    InterchangeFormat.GEDZIP: ("family-tree.gdz", "application/zip"),
}


class GedcomPreviewView(WorkspaceApiView):
    parser_classes = (MultiPartParser,)

    @extend_schema(request={"multipart/form-data": UploadSerializer}, responses=ImportReportSerializer)
    def post(self, request: Request) -> Response:
        report = container().interchange.preview(principal_of(request), uploaded_bytes(request))
        return Response(ImportReportSerializer(report).data)


class GedcomImportView(WorkspaceApiView):
    parser_classes = (MultiPartParser,)

    @extend_schema(request={"multipart/form-data": UploadSerializer}, responses={201: ImportResultSerializer})
    def post(self, request: Request) -> Response:
        outcome = container().interchange.import_file(principal_of(request), uploaded_bytes(request))
        return Response(ImportResultSerializer(outcome).data, status=status.HTTP_201_CREATED)


class GedcomExportView(WorkspaceApiView):
    @extend_schema(
        parameters=[ExportQuerySerializer], responses={(200, "application/octet-stream"): OpenApiTypes.BINARY}
    )
    def get(self, request: Request) -> HttpResponse:
        interchange_format = validated(ExportQuerySerializer, request.query_params)
        content = container().interchange.export(principal_of(request), interchange_format)
        filename, content_type = DOWNLOADS[interchange_format]
        return HttpResponse(
            content,
            content_type=content_type,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Cache-Control": "no-store",
            },
        )


def uploaded_bytes(request: Request) -> bytes:
    upload = request.FILES.get("file")
    if not isinstance(upload, UploadedFile):
        message = "Choose a GEDCOM or GEDZIP file."
        raise InvalidInput("validation.invalid", message, {"file": [message]})
    if upload.size is None or upload.size > MAX_UPLOAD_BYTES:
        raise InvalidInput("gedcom.too_large", TOO_LARGE)
    content: bytes = upload.read()
    return content
