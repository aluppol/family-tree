from rest_framework.test import APIClient

EXPECTED_PATHS = {
    "/api/me/",
    "/api/workspace/",
    "/api/workspace/home-person/",
    "/api/people/",
    "/api/people/{person_id}/",
    "/api/people/{person_id}/chart/",
    "/api/people/{person_id}/photo/",
    "/api/people/{person_id}/parent-candidates/",
    "/api/people/{person_id}/child-candidates/",
    "/api/people/{person_id}/partner-candidates/",
    "/api/parent-links/",
    "/api/parent-links/{link_id}/",
    "/api/partnerships/",
    "/api/partnerships/{partnership_id}/",
    "/api/gedcom/preview/",
    "/api/gedcom/import/",
    "/api/gedcom/export/",
}


def test_the_openapi_schema_documents_every_endpoint(member: APIClient) -> None:
    response = member.get("/api/schema/", HTTP_ACCEPT="application/vnd.oai.openapi+json")
    schema = response.json()
    assert (response.status_code, schema["openapi"][:2], set(schema["paths"])) == (200, "3.", EXPECTED_PATHS)
    assert "gatewayAccessToken" in schema["components"]["securitySchemes"]


def test_the_api_documentation_page_is_served(member: APIClient) -> None:
    response = member.get("/api/docs/")
    assert (response.status_code, b"swagger-ui" in response.content) == (200, True)
