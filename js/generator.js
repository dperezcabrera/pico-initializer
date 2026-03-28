// generator.js — Generic engine: tools contribute files + metadata,
// the assembler (first tool) receives all contributions.
// No DOM, no JSZip, no side-effects. Pure function output.

export class Generator {
  #assembler = null;
  #tools = [];

  /**
   * Set the assembler — the tool that generates composed files
   * from contributions of other tools.
   */
  assembler(tool) {
    this.#assembler = tool;
    return this;
  }

  register(tool) {
    this.#tools.push(tool);
    return this;
  }

  list() {
    const tools = this.#tools.map(({ name, description }) => ({ name, description }));
    if (this.#assembler) {
      tools.unshift({ name: this.#assembler.name, description: this.#assembler.description });
    }
    return tools;
  }

  /**
   * @param {Object} config — flat JSON config
   * @returns {Object.<string, string>} filePath → content
   */
  generate(config) {
    // 1. Collect contributions from all matching tools
    const active = this.#tools.filter((t) => t.matches(config));
    const contributions = [];
    const files = {};

    for (const tool of active) {
      const result = tool.generate(config);
      const toolFiles = result.files || {};
      for (const [path, content] of Object.entries(toolFiles)) {
        files[path] = content;
      }
      contributions.push(result);
    }

    // 2. Assembler generates composed files from contributions
    if (this.#assembler) {
      const assembled = this.#assembler.generate(config, contributions);
      const assembledFiles = assembled.files || assembled;
      for (const [path, content] of Object.entries(assembledFiles)) {
        if (!(path in files)) {
          files[path] = content;
        }
      }
    }

    return files;
  }
}
