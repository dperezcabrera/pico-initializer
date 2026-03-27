// agent.js — pico-agent: LLM agents and tools

export default {
  name: 'agent',
  description: 'LLM agents with tool calling',

  matches(config) {
    return config.modules.includes('agent');
  },

  generate(config) {
    const pkg = config.packageName;

    return {
      files: {
        [`${pkg}/tools.py`]: `from pico_ioc import component
from pico_agent import tool


@tool(name="greet", description="Greet someone by name")
@component
class GreetTool:
    def run(self, name: str) -> str:
        return f"Hello, {name}!"
`,
        [`${pkg}/agents.py`]: `from pico_agent import agent


@agent(
    name="assistant",
    system_prompt="You are a helpful assistant. Use the available tools to help the user.",
    tools=["greet"],
)
class Assistant:
    pass
`,
      },
      dependencies: ['"pico-agent>=0.1.0"'],
      requirements: ['pico-agent'],
      bootModules: [`"pico_agent"`, `"${pkg}.tools"`, `"${pkg}.agents"`],
    };
  },
};
