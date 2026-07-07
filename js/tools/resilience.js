// resilience.js — pico-resilience: retry/circuit-breaker/timeout AOP (deps only, auto-discovered)
import { dep } from '../versions.js';

export default {
  name: 'resilience',
  description: 'Resilience AOP: @retryable, @circuit_breaker, @timeout',

  matches(config) {
    return config.modules.includes('resilience');
  },

  generate() {
    return {
      files: {},
      dependencies: [dep('pico-resilience')],
      requirements: ['pico-resilience'],
    };
  },
};
