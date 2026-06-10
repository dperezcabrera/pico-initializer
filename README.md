# pico-initializer

Project generator for the [pico-boot](https://github.com/dperezcabrera/pico-boot) ecosystem.

Select modules, configure options, and download a ready-to-run project as a ZIP.

**[Open pico-initializer](https://dperezcabrera.github.io/pico-initializer/)**

## Usage

### Browser

Visit the [web app](https://dperezcabrera.github.io/pico-initializer/) and click **Generate**.

### CLI

```bash
node cli.js '{"projectName":"my-service","modules":["fastapi","sqlalchemy"]}'
```

## AI agent skills

By default (option `includeSkills` / the **AI skills** checkbox), generated
projects include a `CLAUDE.md` with the project conventions and an
`install-skills.sh` that installs the [pico-skills](https://github.com/dperezcabrera/pico-skills)
generators for Claude Code (`.claude/skills/`) and OpenAI Codex
(`.agents/skills/`), tailored to the selected modules:

```bash
bash install-skills.sh
```

## Versioning

Dependency constraints for generated projects live in a single map:
[`js/versions.js`](js/versions.js). Bump it when releasing a new pico-* package.

## Links

- [pico-boot](https://github.com/dperezcabrera/pico-boot) — Bootstrap and plugin auto-discovery
- [pico-skills](https://github.com/dperezcabrera/pico-skills) — AI-assisted code generation skills ([docs](https://dperezcabrera.github.io/pico-skills/))
- [pico-ioc](https://github.com/dperezcabrera/pico-ioc) — IoC container ([docs](https://dperezcabrera.github.io/pico-ioc/))

## License

MIT
