// fastapi.js — pico-fastapi: controllers + HTTP routes

export default {
  name: 'fastapi',
  description: 'FastAPI controllers and HTTP routes',

  matches(config) {
    return config.modules.includes('fastapi');
  },

  generate(config) {
    const pkg = config.packageName;

    return {
      files: {
        [`${pkg}/controllers.py`]: `from pico_fastapi import controller, get

from ${pkg}.services import ExampleService


@controller(prefix="/api/example", tags=["Example"])
class ExampleController:
    def __init__(self, service: ExampleService):
        self.service = service

    @get("/{name}")
    async def greet(self, name: str):
        message = self.service.greet(name)
        return {"message": message}
`,
      },
      dependencies: ['"pico-fastapi>=0.1.0"'],
      requirements: ['pico-fastapi', 'uvicorn'],
      bootModules: [`"pico_fastapi"`, `"${pkg}.controllers"`],
      yaml: `\nfastapi:\n  title: "${config.projectName}"\n  version: "0.1.0"\n`,
    };
  },
};
