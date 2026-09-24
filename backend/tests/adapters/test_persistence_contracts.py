import pytest

from family_tree.adapters.persistence.people import DjangoPersonRepository
from family_tree.adapters.persistence.trees import DjangoFamilyTreeRepository
from family_tree.adapters.persistence.unit_of_work import DjangoUnitOfWork
from family_tree.domain.enums import OwnerKind, Sex
from family_tree.domain.errors import WorkspaceAlreadyExists
from family_tree.domain.people import LifeEvent, PersonProfile
from family_tree.domain.workspaces import WorkspaceOwner

DATABASE = "default"
OWNER = WorkspaceOwner(OwnerKind.MEMBER, "uow-owner")
PROFILE = PersonProfile(
    given_names="Ada", surname="Test", sex=Sex.FEMALE, birth=LifeEvent(), death=None, biography=""
)

pytestmark = pytest.mark.django_db


def test_leaving_the_unit_of_work_without_commit_rolls_back() -> None:
    unit_of_work, trees = DjangoUnitOfWork(DATABASE), DjangoFamilyTreeRepository(DATABASE)
    with unit_of_work:
        trees.add(OWNER)
    assert trees.find_by_owner(OWNER) is None


def test_a_committed_unit_of_work_keeps_its_changes() -> None:
    unit_of_work, trees = DjangoUnitOfWork(DATABASE), DjangoFamilyTreeRepository(DATABASE)
    with unit_of_work:
        tree = trees.add(OWNER)
        DjangoPersonRepository(DATABASE).add(tree.id, PROFILE)
        unit_of_work.commit()
    assert DjangoPersonRepository(DATABASE).count(tree.id) == 1


def test_an_error_inside_the_unit_of_work_rolls_back() -> None:
    unit_of_work, trees = DjangoUnitOfWork(DATABASE), DjangoFamilyTreeRepository(DATABASE)
    with pytest.raises(RuntimeError):
        add_commit_and_fail(unit_of_work, trees)
    assert trees.find_by_owner(OWNER) is None


def test_nested_units_of_work_commit_independently() -> None:
    unit_of_work, trees = DjangoUnitOfWork(DATABASE), DjangoFamilyTreeRepository(DATABASE)
    other_owner = WorkspaceOwner(OwnerKind.MEMBER, "inner-owner")
    with unit_of_work:
        trees.add(OWNER)
        with unit_of_work:
            trees.add(other_owner)
        unit_of_work.commit()
    assert (trees.find_by_owner(OWNER) is not None, trees.find_by_owner(other_owner)) == (True, None)


def test_a_second_workspace_for_the_same_owner_is_refused() -> None:
    trees = DjangoFamilyTreeRepository(DATABASE)
    trees.add(OWNER)
    with pytest.raises(WorkspaceAlreadyExists):
        trees.add(OWNER)


def add_commit_and_fail(unit_of_work: DjangoUnitOfWork, trees: DjangoFamilyTreeRepository) -> None:
    with unit_of_work:
        trees.add(OWNER)
        unit_of_work.commit()
        raise RuntimeError
