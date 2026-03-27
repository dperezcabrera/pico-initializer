// docker.js — Dockerfile generation

export default {
  name: 'docker',
  description: 'Dockerfile for containerized deployment',

  matches(config) {
    return config.includeDocker === true;
  },

  generate(config) {
    const hasFastapi = config.modules.includes('fastapi');
    const cmd = hasFastapi
      ? `CMD ["uvicorn", "${config.packageName}.main:app", "--host", "0.0.0.0", "--port", "8000"]`
      : `CMD ["python", "-m", "${config.packageName}.main"]`;

    return {
      files: {
        Dockerfile: `FROM python:${config.pythonVersion}-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN pip install --no-cache-dir -e .

EXPOSE 8000

${cmd}
`,
      },
    };
  },
};
