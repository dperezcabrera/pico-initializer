// actuator.js — pico-actuator: /actuator/health + /info + /metrics (deps + yaml only, auto-discovered)
import { dep } from '../versions.js';

export default {
  name: 'actuator',
  description: 'Actuator endpoints: /actuator/health, /info, /metrics',

  matches(config) {
    return config.modules.includes('actuator');
  },

  generate(config) {
    return {
      files: {},
      dependencies: [dep('pico-actuator')],
      requirements: ['pico-actuator'],
      yaml: `actuator:\n  show_components: true\n  info:\n    app: "${config.projectName}"\n`,
    };
  },
};
