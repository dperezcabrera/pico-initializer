// httpx.js — pico-httpx: declarative HTTP clients (deps only, auto-discovered)
import { dep } from '../versions.js';

export default {
  name: 'httpx',
  description: 'Declarative HTTP clients: @http_client + @get/@post',

  matches(config) {
    return config.modules.includes('httpx');
  },

  generate() {
    return {
      files: {},
      dependencies: [dep('pico-httpx')],
      requirements: ['pico-httpx'],
    };
  },
};
