// sqlalchemy.js — pico-sqlalchemy: models + repositories

export default {
  name: 'sqlalchemy',
  description: 'SQLAlchemy ORM models and repositories with transactions',

  matches(config) {
    return config.modules.includes('sqlalchemy');
  },

  generate(config) {
    const pkg = config.packageName;

    return {
      files: {
        [`${pkg}/models.py`]: `from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from pico_sqlalchemy import AppBase


class ExampleEntity(AppBase):
    __tablename__ = "examples"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(String(500), default="")
`,
        [`${pkg}/repositories.py`]: `from pico_ioc import component
from pico_sqlalchemy import repository, transactional
from pico_sqlalchemy.session import SessionManager

from ${pkg}.models import ExampleEntity


@component
@repository
class ExampleRepository:
    def __init__(self, session_manager: SessionManager):
        self.session_manager = session_manager

    @transactional
    async def create(self, session, name: str, description: str = "") -> ExampleEntity:
        entity = ExampleEntity(name=name, description=description)
        session.add(entity)
        await session.flush()
        return entity

    @transactional(read_only=True)
    async def find_by_id(self, session, entity_id: int) -> ExampleEntity | None:
        return await session.get(ExampleEntity, entity_id)
`,
      },
      dependencies: ['"pico-sqlalchemy>=0.1.0"', '"aiosqlite>=0.20.0"'],
      requirements: ['pico-sqlalchemy', 'aiosqlite'],
      yaml: `\ndatabase:\n  url: "sqlite+aiosqlite:///data.db"\n  echo: true\n`,
      serviceImports: `\nfrom ${pkg}.repositories import ExampleRepository\n`,
      serviceDeps: ['repo: ExampleRepository'],
      serviceAssignments: ['        self.repo = repo'],
    };
  },
};
