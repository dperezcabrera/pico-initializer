// tests.js — Test scaffold with conftest

export default {
  name: 'tests',
  description: 'pytest test scaffold with fixtures',

  matches(config) {
    return config.includeTests === true;
  },

  generate(config) {
    const pkg = config.packageName;
    const hasFastapi = config.modules.includes('fastapi');

    let conftest = `import asyncio

import pytest

from pico_boot import init
from pico_ioc import configuration, YamlTreeSource
`;

    if (hasFastapi) {
      conftest += `from fastapi import FastAPI
from fastapi.testclient import TestClient
`;
    }

    const PKG_OF = {
      fastapi: 'pico_fastapi', sqlalchemy: 'pico_sqlalchemy', celery: 'pico_celery',
      pydantic: 'pico_pydantic', auth: 'pico_client_auth',
      'server-auth': 'pico_server_auth', actuator: 'pico_actuator',
      resilience: 'pico_resilience', cache: 'pico_caching', otel: 'pico_otel',
    };
    const explicitModules = ['"' + pkg + '"']
      .concat(config.modules.filter((m) => PKG_OF[m]).map((m) => '"' + PKG_OF[m] + '"'))
      .join(', ');

    conftest += `

@pytest.fixture(autouse=True)
def _deterministic_plugins(monkeypatch):
    \"\"\"Same composition as production, immune to extra packages in the venv.\"\"\"
    monkeypatch.setenv("PICO_BOOT_AUTO_PLUGINS", "false")


@pytest.fixture
def container():
    config = configuration(YamlTreeSource("application.yaml"))
    c = init(
        modules=[${explicitModules}],
        config=config,
    )
    yield c
    asyncio.run(c.ashutdown())
`;

    if (hasFastapi) {
      conftest += `

@pytest.fixture
def client(container):
    app = container.get(FastAPI)
    return TestClient(app)
`;
    }

    const testApp = `from ${pkg}.services import ExampleService


def test_greet(container):
    service = container.get(ExampleService)
    assert service.greet("world").startswith("Hello world")
`;

    return {
      files: {
        'tests/__init__.py': '',
        'tests/conftest.py': conftest,
        'tests/test_app.py': testApp,
      },
    };
  },
};
