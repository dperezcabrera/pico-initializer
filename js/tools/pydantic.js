// pydantic.js — pico-pydantic: validation (contributes deps only, @validate used in services)

export default {
  name: 'pydantic',
  description: 'Pydantic validation for component methods',

  matches(config) {
    return config.modules.includes('pydantic');
  },

  generate() {
    return {
      files: {},
      dependencies: ['"pico-pydantic>=0.1.0"'],
      requirements: ['pico-pydantic'],
    };
  },
};
