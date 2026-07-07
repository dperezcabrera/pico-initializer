// cache.js — pico-caching: @cacheable AOP (deps only, auto-discovered)
import { dep } from '../versions.js';

export default {
  name: 'cache',
  description: 'Declarative caching: @cacheable with pluggable backends',

  matches(config) {
    return config.modules.includes('cache');
  },

  generate() {
    return {
      files: {},
      dependencies: [dep('pico-caching')],
      requirements: ['pico-caching'],
    };
  },
};
