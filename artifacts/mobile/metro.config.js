const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// expo-dev-launcher (a dependency of expo-dev-client) creates and immediately
// deletes a native-build temp directory during `pnpm install`. In Replit,
// Metro's FallbackWatcher (used when Watchman is unavailable) walks the entire
// pnpm virtual store and tries to fs.watch() that path — which no longer exists
// by start-up time — and crashes with ENOENT. The blockList regex below tells
// Metro to skip any path that matches, preventing the crash.
config.resolver.blockList = [
  /expo-dev-launcher_tmp_\d+/,
];

module.exports = config;
