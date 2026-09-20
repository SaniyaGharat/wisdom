from app.crud.client import (
    get_client,
    get_clients,
    create_client,
    update_client,
    delete_client,
)
from app.crud.supplier import (
    get_supplier,
    get_suppliers,
    create_supplier,
    update_supplier,
    delete_supplier,
)

__all__ = [
    "get_client",
    "get_clients",
    "create_client",
    "update_client",
    "delete_client",
    "get_supplier",
    "get_suppliers",
    "create_supplier",
    "update_supplier",
    "delete_supplier",
]
