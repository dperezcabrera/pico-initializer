// data-redis.js — pico-data-redis: Redis client + distributed cache backend (deps only, auto-discovered)
import { dep } from '../versions.js';

export default {
  name: 'redis',
  description: 'Redis client and distributed cache backend',

  matches(config) {
    return config.modules.includes('redis');
  },

  generate() {
    return {
      files: {},
      dependencies: [dep('pico-data-redis')],
      requirements: ['pico-data-redis'],
    };
  },
};
