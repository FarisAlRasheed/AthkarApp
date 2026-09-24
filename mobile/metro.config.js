const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// content/ lives at the repo root, shared with the editor.
config.watchFolders = [path.resolve(__dirname, '../content')];

module.exports = config;
