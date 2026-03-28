// example-celery.js — Worker/Client example for pico-celery
// Requires: celery

export default {
  name: 'example-celery',
  description: 'Complete Celery worker + client example with DI',

  matches(config) {
    return (
      config.includeExampleCelery === true &&
      config.modules.includes('celery')
    );
  },

  generate(config) {
    const pkg = config.packageName;
    const dir = 'examples/celery_tasks';

    const files = {};

    files[`${dir}/__init__.py`] = '';

    // --- tasks.py (worker side) ---
    files[`${dir}/tasks.py`] = `from pico_ioc import component
from pico_celery import task


@component(scope="prototype")
class MathTasks:
    @task(name="math.add")
    async def add(self, x: int, y: int) -> int:
        return x + y

    @task(name="math.multiply")
    async def multiply(self, x: int, y: int) -> int:
        return x * y


@component(scope="prototype")
class NotificationTasks:
    @task(name="notify.send_email")
    async def send_email(self, to: str, subject: str, body: str) -> dict:
        # In production, call your email service here
        return {"sent_to": to, "subject": subject, "status": "sent"}
`;

    // --- worker.py ---
    files[`${dir}/worker.py`] = `"""Celery worker entry point.

Run:
    celery -A examples.celery_tasks.worker:celery_app worker --loglevel=info
"""
from celery import Celery
from pico_boot import init
from pico_ioc import configuration, YamlTreeSource

config = configuration(YamlTreeSource("application.yaml"))

container = init(modules=["examples.celery_tasks.tasks"], config=config)

celery_app = container.get(Celery)
`;

    // --- client.py ---
    files[`${dir}/client.py`] = `"""Celery client — sends tasks to the worker.

Run:
    python -m examples.celery_tasks.client
"""
from pico_boot import init
from pico_ioc import configuration, YamlTreeSource
from pico_celery import celery, send_task


@celery
class MathClient:
    @send_task(name="math.add")
    def add(self, x: int, y: int):
        pass  # Body never executes — intercepted by pico-celery

    @send_task(name="math.multiply")
    def multiply(self, x: int, y: int):
        pass


@celery
class NotificationClient:
    @send_task(name="notify.send_email")
    def send_email(self, to: str, subject: str, body: str):
        pass


def main():
    config = configuration(YamlTreeSource("application.yaml"))
    container = init(modules=[__name__], config=config)

    math = container.get(MathClient)
    notif = container.get(NotificationClient)

    # Send tasks (returns AsyncResult)
    result = math.add(2, 3)
    print(f"add(2,3) task id: {result.id}")
    print(f"result: {result.get(timeout=10)}")

    result = math.multiply(4, 5)
    print(f"multiply(4,5): {result.get(timeout=10)}")

    result = notif.send_email("user@example.com", "Hello", "Welcome!")
    print(f"send_email: {result.get(timeout=10)}")


if __name__ == "__main__":
    main()
`;

    // --- README.md ---
    files[`${dir}/README.md`] = `# Celery Worker/Client Example

## Setup

Start Redis (or use docker):

\`\`\`bash
docker run -d --name redis -p 6379:6379 redis:alpine
\`\`\`

## Run the worker

\`\`\`bash
celery -A examples.celery_tasks.worker:celery_app worker --loglevel=info
\`\`\`

## Send tasks from the client

\`\`\`bash
python -m examples.celery_tasks.client
\`\`\`

## Architecture

\`\`\`
Client (client.py)
  \\u2502 @send_task sends to broker
  \\u2193
Redis broker
  \\u2502
  \\u2193
Worker (worker.py)
  \\u2502 @task executes with DI
  \\u2193
Result stored in Redis
  \\u2502
  \\u2193
Client gets result via AsyncResult.get()
\`\`\`
`;

    return { files };
  },
};
