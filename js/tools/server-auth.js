// server-auth.js — pico-server-auth: embedded auth server with JWT, wallet login, JWKS
import { dep } from '../versions.js';

export default {
  name: 'server-auth',
  description: 'Embedded auth server with JWT issuance, wallet login, and JWKS',

  matches(config) {
    return config.modules.includes('server-auth');
  },

  generate(config) {
    const pkg = config.packageName;

    return {
      files: {
        [`${pkg}/challenge_store.py`]: `# Challenge store for pico-server-auth wallet login.
#
# By default, pico-server-auth stores challenge nonces in memory.
# That works for single-process deployments but nonces are lost on restart
# and not shared across instances.
#
# Uncomment and implement the class below to use a persistent store
# (Redis, database, etc.). Delete this file to keep the default in-memory behavior.
#
# from pico_ioc import component
# from pico_server_auth import ChallengeStore
#
#
# @component
# class PersistentChallengeStore:
#     """Replace in-memory challenge store with persistent storage."""
#
#     def create(self, address: str) -> str:
#         # Generate nonce, store with TTL, return nonce
#         ...
#
#     def validate(self, address: str, nonce: str) -> bool:
#         # Check nonce exists, not expired, consume it
#         ...
#
#     def cleanup(self) -> int:
#         # Remove expired nonces, return count removed
#         ...
`,
      },
      dependencies: [dep('pico-server-auth')],
      requirements: ['pico-server-auth'],
      yaml: `\nserver_auth:\n  issuer: "http://localhost:8000"\n  audience: "${config.projectName}"\n  auto_create_admin: true\n  admin_email: "admin@example.com"\n  admin_password: "changeme"\n`,
    };
  },
};
