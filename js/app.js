// app.js — UI glue: form → config JSON → engine → JSZip → download

import { appGenerator, moduleGenerator } from './registry.js';

const form = document.getElementById('initializer-form');
const btn = document.getElementById('generate-btn');
const preview = document.getElementById('preview');
const fileList = document.getElementById('file-list');

function readConfig({ includeExample = false, includeExampleCelery = false } = {}) {
  const projectName = document.getElementById('project-name').value.trim();
  const pythonVersion = document.getElementById('python-version').value;
  const modules = [...document.querySelectorAll('input[name="module"]:checked')].map((el) => el.value);
  const packageName = projectName.replace(/-/g, '_').replace(/[^a-z0-9_]/gi, '').toLowerCase();

  return {
    projectName,
    packageName,
    description: 'A pico-boot project.',
    pythonVersion,
    modules,
    includeDocker: document.getElementById('include-docker').checked,
    includeTests: document.getElementById('include-tests').checked,
    includeSkills: document.getElementById('include-skills').checked,
    includeCompose: document.getElementById('include-compose').checked,
    includeAuthServer: document.getElementById('include-auth-server').checked,
    includePicoModule: document.getElementById('include-pico-module').checked,
    includeExample,
    includeExampleCelery,
  };
}

function selectGenerator(config) {
  return config.includePicoModule ? moduleGenerator : appGenerator;
}

// Main generate
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const config = readConfig();
  if (!config.projectName || !config.packageName) {
    alert('Please enter a valid project name.');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Generating...';

  try {
    const gen = selectGenerator(config);
    const files = gen.generate(config);
    showPreview(files);
    await downloadZip(config.projectName, files);
  } catch (err) {
    console.error(err);
    alert('Error generating project: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Generate';
  }
});

// Example downloads
document.addEventListener('download-example', async (e) => {
  const exampleType = e.detail; // 'crud' or 'celery'
  const config = readConfig({
    includeExample: exampleType === 'crud',
    includeExampleCelery: exampleType === 'celery',
  });
  if (!config.projectName || !config.packageName) {
    alert('Please enter a valid project name.');
    return;
  }

  try {
    const gen = selectGenerator(config);
    const files = gen.generate(config);
    const name = `${config.projectName}-example-${e.detail}`;
    await downloadZip(name, files);
  } catch (err) {
    console.error(err);
    alert('Error generating example: ' + err.message);
  }
});

function showPreview(files) {
  fileList.innerHTML = '';
  const paths = Object.keys(files).sort();
  for (const p of paths) {
    const li = document.createElement('li');
    li.textContent = p;
    fileList.appendChild(li);
  }
  preview.style.display = 'block';
}

async function downloadZip(projectName, files) {
  const zip = new JSZip();
  const root = zip.folder(projectName);

  for (const [path, content] of Object.entries(files)) {
    root.file(path, content);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${projectName}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
