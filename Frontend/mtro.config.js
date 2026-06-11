// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push("ttf"); // on garde les fonts
config.transformer.assetPlugins = [
  "expo-asset/tools/hashAssetFiles",
];

module.exports = config;
