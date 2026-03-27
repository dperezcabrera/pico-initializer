// auth.js — pico-client-auth: JWT authentication with RBAC

export default {
  name: 'auth',
  description: 'JWT authentication and role-based access control',

  matches(config) {
    return config.modules.includes('auth');
  },

  generate(config) {
    const pkg = config.packageName;
    const hasFastapi = config.modules.includes('fastapi');

    const files = {};

    // Only generate controller decorator example if fastapi is also selected
    if (hasFastapi) {
      files[`${pkg}/secure_controller.py`] = `from pico_client_auth import requires_role, allow_anonymous
from pico_fastapi import controller, get

from ${pkg}.services import ExampleService


@controller(prefix="/api/secure", tags=["Secure"])
class SecureController:
    def __init__(self, service: ExampleService):
        self.service = service

    @get("/greet/{name}")
    @requires_role("user")
    async def greet(self, name: str):
        message = self.service.greet(name)
        return {"message": message}

    @get("/health")
    @allow_anonymous
    async def health(self):
        return {"status": "ok"}
`;
    }

    const result = {
      files,
      dependencies: ['"pico-client-auth>=0.1.0"'],
      requirements: ['pico-client-auth'],
      yaml: `\nauth_client:\n  enabled: true\n  issuer: "http://localhost:8081"\n  audience: "my-api"\n`,
    };

    return result;
  },
};
