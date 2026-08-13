// pico-module.js — Scaffold for a pico-boot auto-discoverable module.
// When active, overrides the default app scaffold with src/ layout,
// entry point, ruff config, and module-oriented structure.

import { dep, pythonClassifiers } from '../versions.js';

export default {
  name: 'pico-module',
  description: 'Scaffold a pico-boot module with entry point, ruff, and auto-discovery',

  matches(config) {
    return config.includePicoModule === true;
  },

  generate(config) {
    const pkg = config.packageName;
    const name = config.projectName;
    const pyver = config.pythonVersion;
    const pascal = _pascal(pkg);

    const has = (m) => config.modules.includes(m);

    const deps = [
      `    ${dep('pico-ioc', 'yaml')},`,
      `    ${dep('pico-boot')},`,
    ];
    if (has('fastapi'))    deps.push(`    ${dep('pico-fastapi')},`);
    if (has('sqlalchemy')) deps.push(`    ${dep('pico-sqlalchemy')},`);
    if (has('celery'))     deps.push(`    ${dep('pico-celery')},`);
    if (has('pydantic'))   deps.push(`    ${dep('pico-pydantic')},`);
    if (has('auth'))       deps.push(`    ${dep('pico-client-auth')},`);

    const files = {};

    // Override pyproject.toml with src/ layout + entry point + ruff
    files['pyproject.toml'] = `[build-system]
requires = ["setuptools>=69.0", "wheel", "setuptools-scm>=8.0"]
build-backend = "setuptools.build_meta"

[project]
name = "${name}"
description = "${config.description}"
requires-python = ">=${pyver}"
dynamic = ["version"]
classifiers = [
${pythonClassifiers(pyver)}
]
dependencies = [
${deps.join('\n')}
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0.0",
    "pytest-asyncio>=0.24.0",
    "pico-testing>=0.2.0",
    "ruff>=0.9.0",
]

[project.entry-points."pico_boot.modules"]
${pkg} = "${pkg}"

[tool.setuptools]
package-dir = {"" = "src"}

[tool.setuptools.packages.find]
where = ["src"]

[tool.setuptools_scm]
version_scheme = "post-release"
fallback_version = "0.0.0"

[tool.pytest.ini_options]
pico_module = "${pkg}"

[tool.ruff]
target-version = "py${pyver.replace('.', '')}"
line-length = 120
src = ["src", "tests"]

[tool.ruff.lint]
select = ["E", "F", "I", "UP"]
ignore = ["E501"]

[tool.ruff.lint.per-file-ignores]
"tests/*" = ["F841"]
`;

    // Module source under src/
    files[`src/${pkg}/__init__.py`] = `"""${name}: a pico-boot auto-discoverable module."""\n`;

    files[`src/${pkg}/config.py`] = `from dataclasses import dataclass

from pico_ioc import configured


@configured(target="self", prefix="${pkg}", mapping="tree")
@dataclass
class ${pascal}Settings:
    enabled: bool = True
`;

    files[`src/${pkg}/components.py`] = `from pico_ioc import component

from ${pkg}.config import ${pascal}Settings


@component
class ${pascal}Service:
    def __init__(self, settings: ${pascal}Settings):
        self.settings = settings
`;

    // Tests
    files['tests/__init__.py'] = '';

    files['tests/conftest.py'] = `import pytest


@pytest.fixture
def make_container(make_container):
    \"\"\"Extends the pico-testing fixture: kwargs become the ${pkg} config section.\"\"\"
    plugin_make = make_container

    def _make(*extra_modules, **${pkg}_cfg):
        return plugin_make(*extra_modules, config={"${pkg}": ${pkg}_cfg or {"enabled": True}})

    return _make


@pytest.fixture
def container(make_container):
    return make_container()
`;

    files['tests/test_module.py'] = `from ${pkg}.components import ${pascal}Service


def test_service_is_resolved(container):
    service = container.get(${pascal}Service)
    assert service is not None
    assert service.settings.enabled is True
`;

    // Override .gitignore
    files['.gitignore'] = `__pycache__/
*.py[cod]
*.egg-info/
dist/
build/
.venv/
*.db
.mypy_cache/
.pytest_cache/
.ruff_cache/
`;

    // Override README
    files['README.md'] = `# ${name}

A [pico-boot](https://github.com/dperezcabrera/pico-boot) module.

## Installation

\`\`\`bash
pip install ${name}
\`\`\`

Auto-discovered by pico-boot — no need to list in \`modules=[]\`.

## Configuration

\`\`\`yaml
${pkg}:
  enabled: true
\`\`\`

## Development

\`\`\`bash
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
ruff check src/ tests/
pytest tests/
\`\`\`
`;

    // CLAUDE.md — context for AI coding assistants
    const SKILL_PACKAGES = ['fastapi', 'sqlalchemy', 'celery', 'pydantic', 'auth'];
    const skillPkgs = ['boot', ...config.modules.filter((m) => SKILL_PACKAGES.includes(m))];
    const skillsCmd = config.includeSkills
      ? 'bash install-skills.sh'
      : `curl -sL https://raw.githubusercontent.com/dperezcabrera/pico-skills/main/install.sh | bash -s -- ${skillPkgs.join(' ')}`;
    files['CLAUDE.md'] = `# ${name}

A pico-boot auto-discoverable module (src/ layout, \`pico_boot.modules\` entry point).

## Conventions

- Components are classes decorated with \`@component\`; dependencies are injected via the constructor.
- The module is auto-discovered by pico-boot in consuming apps — never listed in \`init(modules=[...])\`.
- Configuration is read from the \`${pkg}:\` section of the consuming app's \`application.yaml\`.

## Commands

- Tests: \`pytest tests/\`
- Lint: \`ruff check src/ tests/\`

## Skills

Pico skills (add-component, add-tests, ...) provide generators for these patterns.
If \`.claude/skills/\` is missing, install them with:

\`\`\`bash
${skillsCmd}
\`\`\`
`;

    return { files };
  },
};

function _pascal(snake) {
  return snake.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
}
