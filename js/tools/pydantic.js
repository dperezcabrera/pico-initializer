// pydantic.js — pico-pydantic: validation (contributes deps only, @validate used in services)
import { dep } from '../versions.js';

export default {
  name: 'pydantic',
  description: 'Pydantic validation for component methods',

  matches(config) {
    return config.modules.includes('pydantic');
  },

  generate() {
    return {
      files: {},
      dependencies: [dep('pico-pydantic')],
      requirements: ['pico-pydantic'],
    };
  },
};
