// base.js — App mode assembler.
// Generates the composed files: main.py, config.py, services.py,
// application.yaml, pyproject.toml, requirements.txt, README.md.
// Merges contributions from other tools (dependencies, yaml, config classes, etc.).

export default {
  name: 'base',
  description: 'Core pico-boot app scaffold with assembled files',

  matches() {
    return true;
  },

  generate(config, contributions) {
    const pkg = config.packageName;
    const has = (m) => config.modules.includes(m);

    // Merge contributions from sibling tools
    const deps = ['"pico-ioc[yaml]>=2.2.0"', '"pico-boot>=0.1.0"'];
    const reqs = ['pico-boot', 'pico-ioc[yaml]'];
    let yaml = `app:\n  name: "${config.projectName}"\n  debug: false\n`;
    let configClasses = '';
    let serviceImports = '';
    const serviceDeps = ['config: "AppSettings"'];
    const serviceAssigns = ['        self.config = config'];

    if (contributions) {
      for (const c of contributions) {
        if (c.dependencies) deps.push(...c.dependencies);
        if (c.requirements) reqs.push(...c.requirements);
        if (c.yaml) yaml += c.yaml;
        if (c.configClasses) configClasses += c.configClasses;
        if (c.serviceImports) serviceImports += c.serviceImports;
        if (c.serviceDeps) serviceDeps.push(...c.serviceDeps);
        if (c.serviceAssignments) serviceAssigns.push(...c.serviceAssignments);
      }
    }

    const files = {};

    files[`${pkg}/__init__.py`] = `"""${config.description}."""\n`;

    // config.py
    let cfgOut = `from dataclasses import dataclass\n\nfrom pico_ioc import configured\n\n\n`;
    cfgOut += `@configured(target="self", prefix="app", mapping="tree")\n@dataclass\nclass AppSettings:\n`;
    cfgOut += `    name: str = "${config.projectName}"\n    debug: bool = False\n`;
    cfgOut += configClasses;
    files[`${pkg}/config.py`] = cfgOut;

    // main.py
    if (has('fastapi')) {
      files[`${pkg}/main.py`] = `from fastapi import FastAPI\nfrom pico_boot import init\nfrom pico_ioc import configuration, YamlTreeSource\n\n\ndef create_app() -> FastAPI:\n    config = configuration(YamlTreeSource("application.yaml"))\n    container = init(modules=["${pkg}"], config=config)\n    return container.get(FastAPI)\n\n\napp = create_app()\n`;
    } else {
      files[`${pkg}/main.py`] = `import asyncio\n\nfrom pico_boot import init\nfrom pico_ioc import configuration, YamlTreeSource\n\nfrom ${pkg}.services import ExampleService\n\n\nasync def main():\n    config = configuration(YamlTreeSource("application.yaml"))\n    container = init(modules=["${pkg}"], config=config)\n    service = await container.aget(ExampleService)\n    print(service.greet("world"))\n    await container.ashutdown()\n\n\nif __name__ == "__main__":\n    asyncio.run(main())\n`;
    }

    // services.py
    const hasPydantic = has('pydantic');
    let svcImports = `from pico_ioc import component\n`;
    if (hasPydantic) svcImports += `from pico_pydantic import validate\n`;
    svcImports += serviceImports;
    const validateDeco = hasPydantic ? '    @validate\n' : '';
    files[`${pkg}/services.py`] = `${svcImports}\n\n@component\nclass ExampleService:\n    def __init__(self, ${serviceDeps.join(', ')}):\n${serviceAssigns.join('\n')}\n\n${validateDeco}    def greet(self, name: str) -> str:\n        return f"Hello {name} from {self.config.name}!"\n`;

    // application.yaml
    files['application.yaml'] = yaml;

    // pyproject.toml
    const depsStr = deps.map((d) => `    ${d},`).join('\n');
    files['pyproject.toml'] = `[build-system]\nrequires = ["setuptools>=69.0", "wheel", "setuptools-scm>=8.0"]\nbuild-backend = "setuptools.build_meta"\n\n[project]\nname = "${config.projectName}"\ndescription = "${config.description}"\nrequires-python = ">=${config.pythonVersion}"\ndynamic = ["version"]\ndependencies = [\n${depsStr}\n]\n\n[tool.setuptools.packages.find]\nwhere = ["."]\n\n[tool.setuptools_scm]\nversion_scheme = "post-release"\n`;

    // requirements.txt
    files['requirements.txt'] = reqs.join('\n') + '\n';

    // README.md
    let run = '';
    if (has('fastapi')) {
      run = `\n## Run\n\n\`\`\`bash\nuvicorn ${pkg}.main:app --reload\n\`\`\`\n`;
    }
    const moduleList = config.modules.length > 0
      ? config.modules.map((m) => `- pico-${m}`).join('\n')
      : '- pico-ioc\n- pico-boot';
    files['README.md'] = `# ${config.projectName}\n\n${config.description}\n\n## Setup\n\n\`\`\`bash\npython -m venv .venv\nsource .venv/bin/activate\npip install -e .\n\`\`\`\n${run}\n## Modules\n\n${moduleList}\n`;

    // .gitignore
    files['.gitignore'] = `__pycache__/\n*.py[cod]\n*.egg-info/\ndist/\nbuild/\n.venv/\n*.db\n.mypy_cache/\n.pytest_cache/\n.ruff_cache/\n`;

    return { files };
  },
};
