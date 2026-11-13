module.exports = ({ config }) => {
  const isDevelopment = process.env.APP_VARIANT === 'development';

  return {
    ...config,
    name: isDevelopment ? 'Strmify Dev' : config.name,
    ios: {
      ...config.ios,
      bundleIdentifier: isDevelopment
        ? 'com.vijayyuvi.strmify.dev'
        : config.ios?.bundleIdentifier,
    },
    android: {
      ...config.android,
      package: isDevelopment
        ? 'com.vijayyuvi.strmify.dev'
        : config.android?.package,
    },
  };
};
