// scheduling.js — pico-scheduling: @scheduled interval/cron jobs (deps only, auto-discovered)
import { dep } from '../versions.js';

export default {
  name: 'scheduling',
  description: 'Scheduled jobs: @scheduled(every=/cron=)',

  matches(config) {
    return config.modules.includes('scheduling');
  },

  generate() {
    return {
      files: {},
      dependencies: [dep('pico-scheduling')],
      requirements: ['pico-scheduling'],
    };
  },
};
