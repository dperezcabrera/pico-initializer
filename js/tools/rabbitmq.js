// rabbitmq.js — pico-rabbitmq: @scheduled interval/cron jobs (deps only, auto-discovered)
import { dep } from '../versions.js';

export default {
  name: 'rabbitmq',
  description: 'RabbitMQ pub-sub: @consumer and @publisher',

  matches(config) {
    return config.modules.includes('rabbitmq');
  },

  generate() {
    return {
      files: {},
      dependencies: [dep('pico-rabbitmq')],
      requirements: ['pico-rabbitmq'],
    };
  },
};
