// compose.js — Docker Compose, optionally with pico-auth server

export default {
  name: 'compose',
  description: 'Docker Compose with app service and optional pico-auth',

  matches(config) {
    return config.includeCompose === true;
  },

  generate(config) {
    const hasFastapi = config.modules.includes('fastapi');
    const hasAuth = config.includeAuthServer === true;
    const appPort = hasFastapi ? 8000 : 8080;

    let services = `services:\n`;

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

    const authEnv = hasAuth
      ? `\n      AUTH_CLIENT__ISSUER: "http://auth:8100"\n      AUTH_CLIENT__AUDIENCE: "${config.projectName}"`
      : '';

    const dependsOn = hasAuth
      ? `\n    depends_on:\n      auth:\n        condition: service_healthy`
      : '';

    services += `
  app:
    build: .
    ports:
      - "${appPort}:${appPort}"${authEnv ? `\n    environment:${authEnv}` : ''}${dependsOn}
`;

    let volumes = '';
    if (hasAuth) {
      volumes = `\nvolumes:\n  auth-keys:\n  auth-db:\n`;
    }

    return {
      files: {
        'docker-compose.yml': services + volumes,
      },
    };
  },
};
