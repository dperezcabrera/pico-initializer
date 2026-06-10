// celery.js — pico-celery: background tasks
import { dep } from '../versions.js';

export default {
  name: 'celery',
  description: 'Celery background tasks with dependency injection',

  matches(config) {
    return config.modules.includes('celery');
  },

  generate(config) {
    const pkg = config.packageName;

    return {
      files: {
        [`${pkg}/tasks.py`]: `from pico_celery import task
from pico_ioc import component


@component
class ExampleTasks:
    @task(name="${pkg}.hello")
    async def hello(self, name: str) -> str:
        return f"Hello {name}!"
`,
      },
      dependencies: [dep('pico-celery'), '"redis>=5.0"'],
      requirements: ['pico-celery', 'redis'],
      yaml: `\ncelery:\n  broker_url: "redis://localhost:6379/0"\n  backend_url: "redis://localhost:6379/0"\n`,
      configClasses: `\n
@configured(target="self", prefix="celery", mapping="tree")
@dataclass
class CelerySettings:
    broker_url: str = "redis://localhost:6379/0"
    backend_url: str = "redis://localhost:6379/0"
`,
    };
  },
};
