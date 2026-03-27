#!/usr/bin/env node

// cli.js — Node CLI entry point for LLM agents and terminal usage.
//
// Usage:
//   node cli.js '<json-config>'
//   node cli.js --output-dir ./out '<json-config>'
//   echo '<json-config>' | node cli.js
//   node cli.js --list                          # list available tools
//
// Config JSON schema:
//   {
//     "projectName": "my-service",
//     "packageName": "my_service",       (optional, derived from projectName)
//     "description": "My service",       (optional)
//     "pythonVersion": "3.12",           (optional, default "3.12")
//     "modules": ["fastapi"],            (optional, default [])
//     "includeDocker": false,            (optional, default false)
//     "includeTests": true               (optional, default true)
//   }

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { generator } from './js/registry.js';

const args = process.argv.slice(2);

// --list: show registered tools
if (args.includes('--list')) {
  const tools = generator.list();
  console.log(JSON.stringify(tools, null, 2));
  process.exit(0);
}

// Parse --output-dir
let outputDir = null;
const odIdx = args.indexOf('--output-dir');
if (odIdx !== -1) {
  outputDir = args[odIdx + 1];
  args.splice(odIdx, 2);
}

// Read config: from argument or stdin
let raw;
if (args.length > 0) {
  raw = args[0];
} else {
  raw = readFileSync('/dev/stdin', 'utf-8');
}

let input;
try {
  input = JSON.parse(raw);
} catch {
  console.error('Error: invalid JSON config');
  process.exit(1);
}

// Apply defaults
const config = {
  projectName: input.projectName,
  packageName: input.packageName || input.projectName.replace(/-/g, '_').replace(/[^a-z0-9_]/gi, '').toLowerCase(),
  description: input.description || 'A pico-framework project.',
  pythonVersion: input.pythonVersion || '3.12',
  modules: input.modules || [],
  includeDocker: input.includeDocker ?? false,
  includeTests: input.includeTests ?? true,
  includeCompose: input.includeCompose ?? false,
  includeAuthServer: input.includeAuthServer ?? false,
  includeExample: input.includeExample ?? false,
};

if (!config.projectName) {
  console.error('Error: projectName is required');
  process.exit(1);
}

const targetDir = outputDir || config.projectName;
const files = generator.generate(config);

for (const [filePath, content] of Object.entries(files)) {
  const fullPath = join(targetDir, filePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, 'utf-8');
  console.log(fullPath);
}
