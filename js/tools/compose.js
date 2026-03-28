// compose.js — Docker Compose, optionally with pico-auth and Redis

export default {
  name: 'compose',
  description: 'Docker Compose with app service and optional pico-auth + Redis',

  matches(config) {
    return config.includeCompose === true;
  },

  generate(config) {
    const hasFastapi = config.modules.includes('fastapi');
    const hasCelery = config.modules.includes('celery');
    const hasAuth = config.includeAuthServer === true;
    const appPort = hasFastapi ? 8000 : 8080;

    let services = `services:\n`;

    // Redis (for Celery broker)
    if (hasCelery) {
      services += `
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
`;
    }

    // pico-auth server
    if (hasAuth) {
      services += `
  auth:
    image: dperezcabrera/pico-auth:latest
    ports:
      - "8100:8100"
    environment:
      AUTH__ISSUER: "http://auth:8100"
      AUTH__AUDIENCE: "${config.projectName}"
      AUTH__AUTO_CREATE_ADMIN: "true"
      AUTH__ADMIN_EMAIL: "admin@pico.local"
      AUTH__ADMIN_PASSWORD: "admin"
      AUTH__ALGORITHM: "RS256"
      DATABASE__URL: "sqlite+aiosqlite:///auth.db"
    volumes:
      - auth-keys:/root/.pico-auth
      - auth-db:/app
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8100/api/v1/auth/jwks')"]
      interval: 5s
      timeout: 3s
      retries: 10
`;
    }

    // App environment
    const envLines = [];
    if (hasAuth) {
      envLines.push(`      AUTH_CLIENT__ISSUER: "http://auth:8100"`);
      envLines.push(`      AUTH_CLIENT__AUDIENCE: "${config.projectName}"`);
    }
    if (hasCelery) {
      envLines.push(`      CELERY__BROKER_URL: "redis://redis:6379/0"`);
      envLines.push(`      CELERY__BACKEND_URL: "redis://redis:6379/1"`);
    }

    const envBlock = envLines.length > 0
      ? `\n    environment:\n${envLines.join('\n')}`
      : '';

    // App depends_on
    const deps = [];
    if (hasAuth) deps.push(`      auth:\n        condition: service_healthy`);
    if (hasCelery) deps.push(`      redis:\n        condition: service_healthy`);
    const dependsOn = deps.length > 0
      ? `\n    depends_on:\n${deps.join('\n')}`
      : '';

    services += `
  app:
    build: .
    ports:
      - "${appPort}:${appPort}"${envBlock}${dependsOn}
`;

    // Celery worker service
    if (hasCelery) {
      const pkg = config.packageName;
      services += `
  worker:
    build: .
    command: celery -A ${pkg}.worker:celery_app worker --loglevel=info
    environment:
      CELERY__BROKER_URL: "redis://redis:6379/0"
      CELERY__BACKEND_URL: "redis://redis:6379/1"${hasAuth ? `\n      AUTH_CLIENT__ISSUER: "http://auth:8100"\n      AUTH_CLIENT__AUDIENCE: "${config.projectName}"` : ''}
    depends_on:
      redis:
        condition: service_healthy
`;
    }

    // Volumes
    const volumeLines = [];
    if (hasAuth) {
      volumeLines.push('  auth-keys:');
      volumeLines.push('  auth-db:');
    }
    const volumes = volumeLines.length > 0
      ? `\nvolumes:\n${volumeLines.join('\n')}\n`
      : '';

    return {
      files: {
        'docker-compose.yml': services + volumes,
      },
    };
  },
};
