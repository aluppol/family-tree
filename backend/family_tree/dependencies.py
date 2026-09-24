from collections.abc import Callable
from dataclasses import dataclass
from functools import cache, partial
from pathlib import Path

from django.conf import settings

from family_tree.adapters.demo.bundled import BundledDemoFamily
from family_tree.adapters.gedcom.reader import GedcomReader
from family_tree.adapters.gedcom.registry import writer_for
from family_tree.adapters.identity.development import DevelopmentIdentity
from family_tree.adapters.identity.development import write_development_identity as write_identity_files
from family_tree.adapters.identity.tokens import JwtTokenVerifier, signing_keys_at
from family_tree.adapters.persistence.graph import PostgresKinshipGraph
from family_tree.adapters.persistence.health import is_database_reachable
from family_tree.adapters.persistence.people import DjangoPersonRepository
from family_tree.adapters.persistence.photos import DjangoPhotoStore
from family_tree.adapters.persistence.relationships import (
    DjangoParentLinkRepository,
    DjangoPartnershipRepository,
)
from family_tree.adapters.persistence.trees import DjangoFamilyTreeRepository
from family_tree.adapters.persistence.unit_of_work import DjangoUnitOfWork
from family_tree.domain.enums import Role
from family_tree.domain.ports import TokenVerifier
from family_tree.domain.services.charts import ChartService
from family_tree.domain.services.demo import DemoSandboxService
from family_tree.domain.services.importing import DocumentImporter
from family_tree.domain.services.interchange import InterchangeService
from family_tree.domain.services.kinship import KinshipService
from family_tree.domain.services.people import PeopleService
from family_tree.domain.services.photos import PhotoService
from family_tree.domain.services.workspaces import WorkspaceService

DATABASE_ALIAS = "default"


@dataclass(frozen=True, slots=True, kw_only=True)
class Container:
    token_verifier: TokenVerifier
    workspaces: WorkspaceService
    people: PeopleService
    kinship: KinshipService
    charts: ChartService
    photos: PhotoService
    interchange: InterchangeService
    demo: DemoSandboxService
    database_probe: Callable[[], bool]


@dataclass(frozen=True, slots=True, kw_only=True)
class _Adapters:
    unit_of_work: DjangoUnitOfWork
    trees: DjangoFamilyTreeRepository
    people: DjangoPersonRepository
    parent_links: DjangoParentLinkRepository
    partnerships: DjangoPartnershipRepository
    photos: DjangoPhotoStore
    graph: PostgresKinshipGraph


@cache
def container() -> Container:
    adapters = _adapters(DATABASE_ALIAS)
    workspaces = _workspace_service(adapters)
    return Container(
        token_verifier=_token_verifier(),
        workspaces=workspaces,
        people=_people_service(adapters, workspaces),
        kinship=_kinship_service(adapters, workspaces),
        charts=ChartService(workspaces=workspaces, people=adapters.people, graph=adapters.graph),
        photos=PhotoService(
            unit_of_work=adapters.unit_of_work,
            workspaces=workspaces,
            people=adapters.people,
            photos=adapters.photos,
        ),
        interchange=_interchange_service(adapters, workspaces),
        demo=DemoSandboxService(unit_of_work=adapters.unit_of_work, trees=adapters.trees),
        database_probe=partial(is_database_reachable, DATABASE_ALIAS),
    )


def write_development_identity(directory: Path, *, issuer: str, audience: str, role: Role) -> None:
    write_identity_files(directory, DevelopmentIdentity(issuer=issuer, audience=audience, role=role))


def _adapters(database_alias: str) -> _Adapters:
    return _Adapters(
        unit_of_work=DjangoUnitOfWork(database_alias),
        trees=DjangoFamilyTreeRepository(database_alias),
        people=DjangoPersonRepository(database_alias),
        parent_links=DjangoParentLinkRepository(database_alias),
        partnerships=DjangoPartnershipRepository(database_alias),
        photos=DjangoPhotoStore(database_alias),
        graph=PostgresKinshipGraph(database_alias),
    )


def _token_verifier() -> JwtTokenVerifier:
    return JwtTokenVerifier(
        keys=signing_keys_at(settings.IDENTITY_JWKS_URL),
        issuer=settings.IDENTITY_ISSUER,
        audience=settings.IDENTITY_AUDIENCE,
    )


def _people_service(adapters: _Adapters, workspaces: WorkspaceService) -> PeopleService:
    return PeopleService(
        unit_of_work=adapters.unit_of_work,
        workspaces=workspaces,
        people=adapters.people,
        parent_links=adapters.parent_links,
        partnerships=adapters.partnerships,
        photos=adapters.photos,
    )


def _importer(adapters: _Adapters) -> DocumentImporter:
    return DocumentImporter(
        people=adapters.people,
        parent_links=adapters.parent_links,
        partnerships=adapters.partnerships,
        photos=adapters.photos,
    )


def _workspace_service(adapters: _Adapters) -> WorkspaceService:
    return WorkspaceService(
        unit_of_work=adapters.unit_of_work,
        trees=adapters.trees,
        people=adapters.people,
        demo_family=BundledDemoFamily(GedcomReader()),
        importer=_importer(adapters),
    )


def _kinship_service(adapters: _Adapters, workspaces: WorkspaceService) -> KinshipService:
    return KinshipService(
        unit_of_work=adapters.unit_of_work,
        workspaces=workspaces,
        people=adapters.people,
        parent_links=adapters.parent_links,
        partnerships=adapters.partnerships,
        graph=adapters.graph,
    )


def _interchange_service(adapters: _Adapters, workspaces: WorkspaceService) -> InterchangeService:
    return InterchangeService(
        unit_of_work=adapters.unit_of_work,
        workspaces=workspaces,
        reader=GedcomReader(),
        writer_for=writer_for,
        importer=_importer(adapters),
        trees=adapters.trees,
        repositories=(adapters.people, adapters.parent_links, adapters.partnerships, adapters.photos),
    )
