// otel.js — pico-otel: OpenTelemetry auto-instrumentation (deps + yaml, auto-discovered)
import { dep } from '../versions.js';

export default {
  name: 'otel',
  description: 'OpenTelemetry tracing + metrics + log correlation',

  matches(config) {
    return config.modules.includes('otel');
  },

  generate(config) {
    return {
      files: {},
      dependencies: [dep('pico-otel')],
      requirements: ['pico-otel[all]'],
      yaml: `otel:\n  service_name: "${config.projectName}"\n  traces_exporter: none  # set endpoint + auto/otlp in production\n`,
    };
  },
};
