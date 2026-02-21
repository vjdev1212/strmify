const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withAbiFilters(config) {
  return withAppBuildGradle(config, (config) => {
    config.modResults.contents = config.modResults.contents.replace(
      /defaultConfig\s*\{/,
      `defaultConfig {
        ndk {
            abiFilters "arm64-v8a", "armeabi-v7a"
        }`
    );
    return config;
  });
};