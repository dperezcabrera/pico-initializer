// example-crud.js — Products CRUD API example (from pico_full_guide)
// Requires: fastapi + sqlalchemy

export default {
  name: 'example-crud',
  description: 'Complete Products CRUD API example with validation and RBAC',

  matches(config) {
    return (
      config.includeExample === true &&
      config.modules.includes('fastapi') &&
      config.modules.includes('sqlalchemy')
    );
  },

  generate(config) {
    const hasAuth = config.modules.includes('auth');
    const hasPydantic = config.modules.includes('pydantic');
    const dir = 'examples/products_api';

    const files = {};

    // --- models.py ---
    files[`${dir}/models.py`] = `from sqlalchemy import Integer, String, Float, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from pico_sqlalchemy import AppBase


class Product(AppBase):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    stock: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
`;

    // --- schemas.py ---
    files[`${dir}/schemas.py`] = `from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Self


# --- HTTP schemas ---

class ProductCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    price: float = Field(gt=0)
    stock: int = Field(ge=0, default=0)

    @field_validator("name")
    @classmethod
    def name_no_spaces_only(cls, v: str) -> str:
        if v.strip() == "":
            raise ValueError("Name cannot be whitespace only")
        return v.strip()

    @field_validator("price")
    @classmethod
    def price_max_two_decimals(cls, v: float) -> float:
        if round(v, 2) != v:
            raise ValueError("Price cannot have more than 2 decimal places")
        return v


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    price: float | None = Field(default=None, gt=0)
    stock: int | None = Field(default=None, ge=0)
    active: bool | None = Field(default=None)

    @model_validator(mode="after")
    def at_least_one_field(self) -> Self:
        if all(v is None for v in self.model_dump().values()):
            raise ValueError("At least one field must be provided for update")
        return self


class ProductResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    name: str
    description: str | None
    price: float
    stock: int
    active: bool


class ProductListResponse(BaseModel):
    items: list[ProductResponse]
    total: int
    page: int
    page_size: int


# --- Domain schema (for pico-pydantic @validate) ---

class ProductData(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    price: float = Field(gt=0)
    stock: int = Field(ge=0, default=0)

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        return v.strip()
`;

    // --- repositories.py ---
    files[`${dir}/repositories.py`] = `from pico_sqlalchemy import repository, query, SessionManager, get_session

from .models import Product


@repository(entity=Product)
class ProductRepository:
    def __init__(self, manager: SessionManager):
        self.manager = manager

    async def save(self, product: Product) -> Product:
        session = get_session(self.manager)
        session.add(product)
        await session.flush()
        await session.refresh(product)
        return product

    async def delete(self, product: Product) -> None:
        session = get_session(self.manager)
        await session.delete(product)

    @query(expr="id = :id", unique=True)
    async def find_by_id(self, id: int) -> Product | None: ...

    @query(expr="active = true")
    async def find_all_active(self) -> list[Product]: ...

    @query(expr="active = true", paged=True)
    async def find_active_paged(self, page) -> ...: ...

    @query(expr="name like :pattern")
    async def search_by_name(self, pattern: str) -> list[Product]: ...
`;

    // --- services.py ---
    let serviceImports = `from pico_ioc import component
from pico_sqlalchemy import transactional, PageRequest, Page
from fastapi import HTTPException, status

from .models import Product
from .repositories import ProductRepository
from .schemas import ProductData
`;
    if (hasPydantic) {
      serviceImports += `from pico_pydantic import validate\n`;
    }

    const validateDeco = hasPydantic ? '    @validate\n' : '';

    files[`${dir}/services.py`] = `${serviceImports}

@component
class ProductService:
    def __init__(self, repo: ProductRepository):
        self.repo = repo

${validateDeco}    @transactional
    async def create(self, data: ProductData) -> Product:
        product = Product(
            name=data.name,
            description=data.description,
            price=data.price,
            stock=data.stock,
        )
        return await self.repo.save(product)

    async def get_by_id(self, product_id: int) -> Product:
        product = await self.repo.find_by_id(id=product_id)
        if product is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product {product_id} not found",
            )
        return product

    async def list_active(self) -> list[Product]:
        return await self.repo.find_all_active()

    async def list_paged(self, page: int, page_size: int) -> Page:
        return await self.repo.find_active_paged(
            page=PageRequest(page=page, size=page_size)
        )

    async def search(self, name: str) -> list[Product]:
        return await self.repo.search_by_name(pattern=f"%{name}%")

${validateDeco}    @transactional
    async def update(self, product_id: int, data: ProductData) -> Product:
        product = await self.get_by_id(product_id)
        for field, value in data.model_dump(exclude_none=True).items():
            setattr(product, field, value)
        return await self.repo.save(product)

    @transactional
    async def deactivate(self, product_id: int) -> Product:
        product = await self.get_by_id(product_id)
        product.active = False
        return await self.repo.save(product)

    @transactional
    async def delete(self, product_id: int) -> None:
        product = await self.get_by_id(product_id)
        await self.repo.delete(product)
`;

    // --- controllers.py ---
    let controllerImports = `from pico_fastapi import controller, get, post, put, patch, delete
from fastapi import Query, status

from .services import ProductService
from .schemas import (
    ProductCreate, ProductUpdate,
    ProductResponse, ProductListResponse,
)
`;
    if (hasAuth) {
      controllerImports += `from pico_client_auth import allow_anonymous, requires_role\n`;
    }

    const publicDeco = hasAuth ? '    @allow_anonymous\n' : '';
    const managerDeco = hasAuth ? '    @requires_role("product-manager")\n' : '';
    const adminDeco = hasAuth ? '    @requires_role("admin")\n' : '';

    files[`${dir}/controllers.py`] = `${controllerImports}

@controller(prefix="/api/v1", tags=["Health"])
class HealthController:
    @get("/health")
${publicDeco}    async def health(self):
        return {"status": "ok"}


@controller(prefix="/api/v1/products", tags=["Products"])
class ProductController:
    def __init__(self, service: ProductService):
        self.service = service

    @get("/", response_model=list[ProductResponse])
    async def list_products(self):
        products = await self.service.list_active()
        return [ProductResponse.model_validate(p) for p in products]

    @get("/paged", response_model=ProductListResponse)
    async def list_paged(
        self,
        page: int = Query(default=1, ge=1),
        page_size: int = Query(default=10, ge=1, le=100),
    ):
        result = await self.service.list_paged(page=page, page_size=page_size)
        return ProductListResponse(
            items=[ProductResponse.model_validate(p) for p in result.items],
            total=result.total,
            page=page,
            page_size=page_size,
        )

    @get("/search", response_model=list[ProductResponse])
    async def search(self, q: str = Query(min_length=1)):
        products = await self.service.search(name=q)
        return [ProductResponse.model_validate(p) for p in products]

    @get("/{product_id}", response_model=ProductResponse)
    async def get_product(self, product_id: int):
        product = await self.service.get_by_id(product_id)
        return ProductResponse.model_validate(product)

    @post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
${managerDeco}    async def create_product(self, body: ProductCreate):
        product = await self.service.create(body.model_dump())
        return ProductResponse.model_validate(product)

    @put("/{product_id}", response_model=ProductResponse)
${managerDeco}    async def update_product(self, product_id: int, body: ProductUpdate):
        product = await self.service.update(
            product_id, body.model_dump(exclude_none=True)
        )
        return ProductResponse.model_validate(product)

    @patch("/{product_id}/deactivate", response_model=ProductResponse)
${managerDeco}    async def deactivate_product(self, product_id: int):
        product = await self.service.deactivate(product_id)
        return ProductResponse.model_validate(product)

    @delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
${adminDeco}    async def delete_product(self, product_id: int):
        await self.service.delete(product_id)
`;

    // --- database.py ---
    files[`${dir}/database.py`] = `import asyncio

from pico_ioc import component
from pico_sqlalchemy import DatabaseConfigurer, AppBase


@component
class SchemaSetup(DatabaseConfigurer):
    def __init__(self, base: AppBase):
        self.base = base

    @property
    def priority(self) -> int:
        return 0

    def configure_database(self, engine) -> None:
        async def _create():
            async with engine.begin() as conn:
                await conn.run_sync(self.base.metadata.create_all)
        asyncio.run(_create())
`;

    // --- __init__.py ---
    files[`${dir}/__init__.py`] = '';

    // --- auth.py (optional) ---
    if (hasAuth) {
      files[`${dir}/auth.py`] = `from pico_ioc import component
from pico_client_auth import RoleResolver, TokenClaims


@component
class KeycloakRoleResolver:
    """Custom RoleResolver for Keycloak.

    Only needed if your IdP puts roles in a non-standard claim.
    Remove this file if using the default claim layout.
    """

    async def resolve(self, claims: TokenClaims, raw_claims: dict) -> list[str]:
        realm_roles = raw_claims.get("realm_access", {}).get("roles", [])
        client_roles = (
            raw_claims
            .get("resource_access", {})
            .get("my-api", {})
            .get("roles", [])
        )
        return list(set(realm_roles + client_roles))
`;
    }

    return {
      files,
    };
  },
};
