// base.js — Always active. No standalone files (all assembled by engine).
// Exists to declare base dependencies and boot modules.

export default {
  name: 'base',
  description: 'Core pico-boot project scaffold',

  matches() {
    return true;
  },

  generate(config) {
    return {
      files: {
        '.gitignore': `__pycache__/
*.py[cod]
*.egg-info/
dist/
build/
.venv/
*.db
.mypy_cache/
.pytest_cache/
.ruff_cache/
`,
      },
      dependencies: [],
      requirements: [],
      yaml: '',
      configClasses: '',
      serviceImports: '',
      serviceDeps: [],
      serviceAssignments: [],
    };
  },
};
