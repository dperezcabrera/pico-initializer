// kafka.js — pico-kafka: @scheduled interval/cron jobs (deps only, auto-discovered)
import { dep } from '../versions.js';

export default {
  name: 'kafka',
  description: 'Kafka: @kafka_consumer and @kafka_producer',

  matches(config) {
    return config.modules.includes('kafka');
  },

  generate() {
    return {
      files: {},
      dependencies: [dep('pico-kafka')],
      requirements: ['pico-kafka'],
    };
  },
};
