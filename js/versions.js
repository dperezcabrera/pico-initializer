// versions.js — Single source of truth for pico-* dependency constraints
// used in generated projects.
//
// Update these when releasing a new pico-* version (see the `release` skill
// in pico-skills). Constraints use compatible-release (~=) so generated
// projects receive patches but never an API-breaking minor bump.

export const PICO_VERSIONS = {
  'pico-ioc': '>=2.4.0,<3.0',
  'pico-boot': '~=0.2.0',
  'pico-fastapi': '~=0.3.1',
  'pico-sqlalchemy': '~=0.5.0',
  'pico-celery': '~=0.2.2',
  'pico-pydantic': '~=0.2.2',
  'pico-client-auth': '~=0.5.0',
  'pico-server-auth': '~=0.2.0',
  'pico-actuator': '~=0.2.0',
  'pico-resilience': '~=0.2.0',
  'pico-caching': '~=0.1.0',
  'pico-otel': '~=0.1.0',
  'pico-scheduling': '~=0.1.0',
  'pico-httpx': '~=0.1.0',
  'pico-data-redis': '~=0.1.0',
  'pico-rabbitmq': '~=0.1.0',
  'pico-kafka': '~=0.1.0',
};

// Returns a quoted requirement string for pyproject.toml, e.g.
//   dep('pico-ioc', 'yaml') -> '"pico-ioc[yaml]>=2.4.0,<3.0"'
export function dep(name, extra) {
  const constraint = PICO_VERSIONS[name];
  if (!constraint) throw new Error(`Unknown pico package: ${name}`);
  return `"${name}${extra ? `[${extra}]` : ''}${constraint}"`;
}

// Python versions the fleet tests in CI, oldest first. Keep in sync with the
// ci.yml matrix and with the option list in index.html.
export const PYTHON_VERSIONS = ['3.11', '3.12', '3.13', '3.14'];

// Trove classifiers for a module whose floor is `pyver`, covering every tested
// version from that floor up. Without these, PyPI shows the package as
// unsupported on newer Pythons that CI actually tests.
export function pythonClassifiers(pyver) {
  const i = PYTHON_VERSIONS.indexOf(pyver);
  return [
    '    "Programming Language :: Python :: 3",',
    '    "Programming Language :: Python :: 3 :: Only",',
    ...PYTHON_VERSIONS.slice(i === -1 ? 0 : i).map(
      (v) => `    "Programming Language :: Python :: ${v}",`,
    ),
  ].join('\n');
}
