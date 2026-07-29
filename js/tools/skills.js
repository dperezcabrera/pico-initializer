// skills.js — AI agent skills bootstrap.
// Generates install-skills.sh, which installs the pico-skills generators
// (Claude Code: .claude/skills/, OpenAI Codex: .agents/skills/) tailored
// to the project's selected modules. Skills are fetched from the pico-skills
// repo at install time so they never drift from upstream.

export default {
  name: 'skills',
  description: 'AI agent skills installer (pico-skills for Claude Code / Codex)',

  matches(config) {
    return config.includeSkills === true;
  },

  generate(config) {
    const SKILL_PACKAGES = ['fastapi', 'sqlalchemy', 'celery', 'pydantic', 'auth'];
    const pkgs = ['boot', ...config.modules.filter((m) => SKILL_PACKAGES.includes(m))];

    const script = `#!/usr/bin/env bash
# Install the pico skills for AI coding agents, tailored to this project.
#   Claude Code -> .claude/skills/
#   OpenAI Codex -> .agents/skills/
# Extra arguments are forwarded to the pico-skills installer
# (e.g. --override, --claude, --codex).
set -euo pipefail

curl -sL https://raw.githubusercontent.com/dperezcabrera/pico-skills/main/install.sh \\
    | bash -s -- ${pkgs.join(' ')} "$@"
`;

    return {
      files: {
        'install-skills.sh': script,
      },
    };
  },
};
