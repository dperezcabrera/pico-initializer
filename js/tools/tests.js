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

    let conftest = `import pytest

from pico_boot import init
from pico_ioc import configuration, YamlTreeSource
`;

    if (hasFastapi) {
      conftest += `from fastapi import FastAPI
from fastapi.testclient import TestClient
`;
    }

    conftest += `

@pytest.fixture
def container():
    config = configuration(YamlTreeSource("application.yaml"))
    c = init(
        modules=["${pkg}"],
        config=config,
    )
    yield c
    import asyncio
    asyncio.get_event_loop().run_until_complete(c.ashutdown())
`;

    if (hasFastapi) {
      conftest += `

@pytest.fixture
def client(container):
    app = container.get(FastAPI)
    return TestClient(app)
`;
    }

    return {
      files: {
        'tests/__init__.py': '',
        'tests/conftest.py': conftest,
      },
    };
  },
};
