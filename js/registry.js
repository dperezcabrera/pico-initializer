// registry.js — Two generators: app mode and module mode.
// Each has its own assembler and shared tools.

import { Generator } from './generator.js';
import base from './tools/base.js';
import picoModule from './tools/pico-module.js';
import fastapi from './tools/fastapi.js';
import sqlalchemy from './tools/sqlalchemy.js';
import celery from './tools/celery.js';
import pydantic from './tools/pydantic.js';
import agent from './tools/agent.js';
import auth from './tools/auth.js';
import serverAuth from './tools/server-auth.js';
import docker from './tools/docker.js';
import compose from './tools/compose.js';
import tests from './tools/tests.js';
import exampleCrud from './tools/example-crud.js';
import exampleCelery from './tools/example-celery.js';

// App mode: main.py + application.yaml + composed files
const appGenerator = new Generator();
appGenerator
  .assembler(base)
  .register(fastapi)
  .register(sqlalchemy)
  .register(celery)
  .register(pydantic)
  .register(agent)
  .register(auth)
  .register(serverAuth)
  .register(docker)
  .register(compose)
  .register(tests)
  .register(exampleCrud)
  .register(exampleCelery);

// Module mode: src/ layout + entry point + ruff
const moduleGenerator = new Generator();
moduleGenerator
  .assembler(picoModule);

export { appGenerator, moduleGenerator };
export { Generator } from './generator.js';
