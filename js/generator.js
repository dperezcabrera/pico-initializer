// generator.js — Generic engine: registry + assembler.
// No DOM, no JSZip, no side-effects. Pure function output.

const CONTRIBUTION_DEFAULTS = {
  files: {},
  dependencies: [],
  requirements: [],
  yaml: '',
  configClasses: '',
  serviceImports: '',
  serviceDeps: [],
  serviceAssignments: [],
};

export class Generator {
  #tools = [];

  register(tool) {
    this.#tools.push(tool);
    return this;
  }

  list() {
    return this.#tools.map(({ name, description }) => ({ name, description }));
  }

  /**
   * @param {Object} config — flat JSON config (contract between UI/CLI and engine)
   * @returns {Object.<string, string>} filePath → content
   */
  generate(config) {
    const active = this.#tools.filter((t) => t.matches(config));
    const contributions = active.map((t) => ({
      ...CONTRIBUTION_DEFAULTS,
      ...t.generate(config),
    }));

    // 1. Merge standalone files (no collisions expected)
    const files = {};
    for (const c of contributions) {
      for (const [path, content] of Object.entries(c.files)) {
        files[path] = content;
      }
    }

    // 2. Assemble composed files from merged contributions
    const ctx = this.#mergeContributions(contributions);
    const assembled = this.#assemble(config, ctx);
    for (const [path, content] of Object.entries(assembled)) {
      files[path] = content;
    }

    return files;
  }

  #mergeContributions(contributions) {
    const ctx = {
      dependencies: [],
      requirements: [],
          yaml: '',
      configClasses: '',
      serviceImports: '',
      serviceDeps: [],
      serviceAssignments: [],
    };

    for (const c of contributions) {
      ctx.dependencies.push(...c.dependencies);
      ctx.requirements.push(...c.requirements);
      ctx.yaml += c.yaml;
      ctx.configClasses += c.configClasses;
      ctx.serviceImports += c.serviceImports;
      ctx.serviceDeps.push(...c.serviceDeps);
      ctx.serviceAssignments.push(...c.serviceAssignments);
    }

    return ctx;
  }

  #assemble(config, ctx) {
    const pkg = config.packageName;
    const files = {};

    files[`${pkg}/__init__.py`] = `"""${config.description}."""\n`;
    files[`${pkg}/config.py`] = this.#assembleConfig(config, ctx);
    files[`${pkg}/main.py`] = this.#assembleMain(config, ctx);
    files[`${pkg}/services.py`] = this.#assembleServices(config, ctx);
    files['application.yaml'] = this.#assembleYaml(config, ctx);
    files['pyproject.toml'] = this.#assemblePyproject(config, ctx);
    files['requirements.txt'] = this.#assembleRequirements(ctx);
    files['README.md'] = this.#assembleReadme(config, ctx);

    return files;
  }

  // --- Assemblers for composed files ---

  #assembleConfig(config, ctx) {
    let out = `from dataclasses import dataclass\n\nfrom pico_ioc import configured\n\n\n`;
    out += `@configured(target="self", prefix="app", mapping="tree")\n`;
    out += `@dataclass\n`;
    out += `class AppSettings:\n`;
    out += `    name: str = "${config.projectName}"\n`;
    out += `    debug: bool = False\n`;
    out += ctx.configClasses;
    return out;
  }

  #assembleMain(config, ctx) {
    const pkg = config.packageName;
    const hasFastapi = config.modules.includes('fastapi');

    if (hasFastapi) {
      return `from fastapi import FastAPI
from pico_boot import init
from pico_ioc import configuration, YamlTreeSource


def create_app() -> FastAPI:
    config = configuration(YamlTreeSource("application.yaml"))
    container = init(modules=["${pkg}"], config=config)
    return container.get(FastAPI)


app = create_app()
`;
    }

    return `import asyncio

from pico_boot import init
from pico_ioc import configuration, YamlTreeSource

from ${pkg}.services import ExampleService


async def main():
    config = configuration(YamlTreeSource("application.yaml"))
    container = init(modules=["${pkg}"], config=config)
    service = await container.aget(ExampleService)
    print(service.greet("world"))
    await container.ashutdown()


if __name__ == "__main__":
    asyncio.run(main())
`;
  }

  #assembleServices(config, ctx) {
    const hasPydantic = config.modules.includes('pydantic');

    let imports = `from pico_ioc import component\n`;
    if (hasPydantic) imports += `from pico_pydantic import validate\n`;
    imports += ctx.serviceImports;

    const deps = ['config: "AppSettings"', ...ctx.serviceDeps];
    const assigns = ['        self.config = config', ...ctx.serviceAssignments];

    const validateDeco = hasPydantic ? '    @validate\n' : '';

    return `${imports}

@component
class ExampleService:
    def __init__(self, ${deps.join(', ')}):
${assigns.join('\n')}

${validateDeco}    def greet(self, name: str) -> str:
        return f"Hello {name} from {self.config.name}!"
`;
  }

  #assembleYaml(config, ctx) {
    let yaml = `app:\n  name: "${config.projectName}"\n  debug: false\n`;
    yaml += ctx.yaml;
    return yaml;
  }

  #assemblePyproject(config, ctx) {
    const baseDeps = [
      `"pico-ioc[yaml]>=2.2.0"`,
      `"pico-boot>=0.1.0"`,
      ...ctx.dependencies,
    ];
    const depsStr = baseDeps.map((d) => `    ${d},`).join('\n');

    let scripts = '';

    return `[build-system]
requires = ["setuptools>=69.0", "wheel", "setuptools-scm>=8.0"]
build-backend = "setuptools.build_meta"

[project]
name = "${config.projectName}"
description = "${config.description}"
requires-python = ">=${config.pythonVersion}"
dynamic = ["version"]
dependencies = [
${depsStr}
]

[tool.setuptools.packages.find]
where = ["."]

[tool.setuptools_scm]
version_scheme = "post-release"
${scripts}`;
  }

  #assembleRequirements(ctx) {
    const lines = ['pico-boot', 'pico-ioc[yaml]', ...ctx.requirements];
    return lines.join('\n') + '\n';
  }

  #assembleReadme(config, ctx) {
    const hasFastapi = config.modules.includes('fastapi');
    let run = '';
    if (hasFastapi) {
      run = `\n## Run\n\n\`\`\`bash\nuvicorn ${config.packageName}.main:app --reload\n\`\`\`\n`;
    }

    const moduleList = config.modules.length > 0
      ? config.modules.map((m) => `- pico-${m}`).join('\n')
      : '- pico-ioc\n- pico-boot';

    return `# ${config.projectName}

${config.description}

## Setup

\`\`\`bash
python -m venv .venv
source .venv/bin/activate
pip install -e .
\`\`\`
${run}
## Modules

${moduleList}
`;
  }
}
