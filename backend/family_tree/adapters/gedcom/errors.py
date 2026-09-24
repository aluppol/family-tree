from family_tree.domain.errors import InvalidInput


def unreadable(message: str) -> InvalidInput:
    return InvalidInput("gedcom.unreadable", message)


def too_large(message: str) -> InvalidInput:
    return InvalidInput("gedcom.too_large", message)
