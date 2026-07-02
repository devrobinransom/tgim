// Metro config tuned for the npm-workspaces monorepo so the bundler can
// resolve the @tgim/* packages from the repo root and watch them for changes.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files in the monorepo so edits to @tgim/shared hot-reload.
config.watchFolders = [workspaceRoot];

// 2. Resolve modules from both the app and the hoisted root node_modules.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
