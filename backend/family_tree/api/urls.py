from django.urls import path, re_path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from family_tree.api.errors import api_not_found
from family_tree.api.views.gedcom import GedcomExportView, GedcomImportView, GedcomPreviewView
from family_tree.api.views.kinship import ParentLinksView, ParentLinkView, PartnershipsView, PartnershipView
from family_tree.api.views.people import (
    ChildCandidatesView,
    ParentCandidatesView,
    PartnerCandidatesView,
    PeopleView,
    PersonChartView,
    PersonView,
)
from family_tree.api.views.photos import PersonPhotoView
from family_tree.api.views.workspace import HomePersonView, ViewerView, WorkspaceView

urlpatterns = [
    path("me/", ViewerView.as_view(), name="viewer"),
    path("workspace/", WorkspaceView.as_view(), name="workspace"),
    path("workspace/home-person/", HomePersonView.as_view(), name="home-person"),
    path("people/", PeopleView.as_view(), name="people"),
    path("people/<int:person_id>/", PersonView.as_view(), name="person"),
    path("people/<int:person_id>/chart/", PersonChartView.as_view(), name="person-chart"),
    path("people/<int:person_id>/photo/", PersonPhotoView.as_view(), name="person-photo"),
    path(
        "people/<int:person_id>/parent-candidates/", ParentCandidatesView.as_view(), name="parent-candidates"
    ),
    path("people/<int:person_id>/child-candidates/", ChildCandidatesView.as_view(), name="child-candidates"),
    path(
        "people/<int:person_id>/partner-candidates/",
        PartnerCandidatesView.as_view(),
        name="partner-candidates",
    ),
    path("parent-links/", ParentLinksView.as_view(), name="parent-links"),
    path("parent-links/<int:link_id>/", ParentLinkView.as_view(), name="parent-link"),
    path("partnerships/", PartnershipsView.as_view(), name="partnerships"),
    path("partnerships/<int:partnership_id>/", PartnershipView.as_view(), name="partnership"),
    path("gedcom/preview/", GedcomPreviewView.as_view(), name="gedcom-preview"),
    path("gedcom/import/", GedcomImportView.as_view(), name="gedcom-import"),
    path("gedcom/export/", GedcomExportView.as_view(), name="gedcom-export"),
    path("schema/", SpectacularAPIView.as_view(), name="schema"),
    path("docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
    re_path(r"^.*$", api_not_found),
]
