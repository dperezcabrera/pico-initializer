// versions.js — Single source of truth for pico-* dependency constraints
// used in generated projects.
//
// Update these when releasing a new pico-* version (see the `release` skill
// in pico-skills). Constraints use compatible-release (~=) so generated
// projects receive patches but never an API-breaking minor bump.

export const PICO_VERSIONS = {
  'pico-ioc': '>=2.2.7,<3.0',
  'pico-boot': '~=0.1.2',
  'pico-fastapi': '~=0.3.0',
  'pico-sqlalchemy': '~=0.4.0',
  'pico-celery': '~=0.2.2',
  'pico-pydantic': '~=0.2.2',
  'pico-agent': '~=0.2.0',
  'pico-client-auth': '~=0.4.2',
  'pico-server-auth': '~=0.1.2',
  'pico-actuator': '~=0.1.0',
  'pico-resilience': '~=0.1.0',
  'pico-caching': '~=0.1.0',
  'pico-otel': '~=0.1.0',
  'pico-scheduling': '~=0.1.0',
  'pico-httpx': '~=0.1.0',
  'pico-data-redis': '~=0.1.0',
  'pico-rabbitmq': '~=0.1.0',
  'pico-kafka': '~=0.1.0',
};

// Returns a quoted requirement string for pyproject.toml, e.g.
//   dep('pico-ioc', 'yaml') -> '"pico-ioc[yaml]>=2.2.7,<3.0"'
export function dep(name, extra) {
  const constraint = PICO_VERSIONS[name];
  if (!constraint) throw new Error(`Unknown pico package: ${name}`);
  return `"${name}${extra ? `[${extra}]` : ''}${constraint}"`;
}
