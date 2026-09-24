from django.urls import include, path, re_path

from family_tree.api.views.spa import gateway_path_not_found, single_page_app

handler500 = "family_tree.api.errors.server_error"

urlpatterns = [
    path("api/", include("family_tree.api.urls")),
    re_path(r"^(?:oauth2|assets|static)(?:/.*)?$", gateway_path_not_found),
    re_path(r"^.*$", single_page_app),
]
