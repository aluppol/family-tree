import ast
import io
import tokenize
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parent.parent
MAX_FUNCTION_LINES = 30
SOURCE_FILES = sorted(
    path
    for directory in ("family_tree", "config", "tests")
    for path in (BACKEND / directory).rglob("*.py")
    if "migrations" not in path.parts
)


def relative(path: Path) -> str:
    return str(path.relative_to(BACKEND))


@pytest.mark.parametrize("path", SOURCE_FILES, ids=relative)
def test_has_no_comments(path: Path) -> None:
    tokens = tokenize.generate_tokens(io.StringIO(path.read_text(encoding="utf-8")).readline)
    comments = [
        f"line {token.start[0]}: {token.string}" for token in tokens if token.type == tokenize.COMMENT
    ]
    assert not comments, "\n".join(comments)


@pytest.mark.parametrize("path", SOURCE_FILES, ids=relative)
def test_has_no_docstrings(path: Path) -> None:
    documented = [
        node.name for node in _definitions(path) if ast.get_docstring(node, clean=False) is not None
    ]
    assert not documented, ", ".join(documented)


@pytest.mark.parametrize("path", SOURCE_FILES, ids=relative)
def test_functions_are_short(path: Path) -> None:
    long_functions = [
        f"{node.name}: {_length(node)} lines"
        for node in _definitions(path)
        if isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef) and _length(node) > MAX_FUNCTION_LINES
    ]
    assert not long_functions, "\n".join(long_functions)


def _definitions(path: Path) -> list[ast.FunctionDef | ast.AsyncFunctionDef | ast.ClassDef]:
    tree = ast.parse(path.read_text(encoding="utf-8"))
    return [
        node
        for node in ast.walk(tree)
        if isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef | ast.ClassDef)
    ]


def _length(node: ast.FunctionDef | ast.AsyncFunctionDef) -> int:
    first_line = min([node.lineno, *(decorator.lineno for decorator in node.decorator_list)])
    return (node.end_lineno or node.lineno) - first_line + 1
