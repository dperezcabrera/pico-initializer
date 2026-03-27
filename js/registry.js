// registry.js — Pre-configured Generator instance with all pico tools registered.
// Shared entry point for both browser (app.js) and CLI (cli.js).

import { Generator } from './generator.js';
import base from './tools/base.js';
import fastapi from './tools/fastapi.js';
import sqlalchemy from './tools/sqlalchemy.js';
import celery from './tools/celery.js';
import pydantic from './tools/pydantic.js';
import agent from './tools/agent.js';
import auth from './tools/auth.js';
import docker from './tools/docker.js';
import compose from './tools/compose.js';
import tests from './tools/tests.js';
import exampleCrud from './tools/example-crud.js';

const generator = new Generator();

generator
  .register(base)
  .register(fastapi)
  .register(sqlalchemy)
  .register(celery)
  .register(pydantic)
  .register(agent)
  .register(auth)
  .register(docker)
  .register(compose)
  .register(tests)
  .register(exampleCrud);

export { generator };
export { Generator } from './generator.js';
