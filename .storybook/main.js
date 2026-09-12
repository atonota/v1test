export default {
  stories: ['../frontend/**/*.stories.js'],
  framework: { name: '@storybook/html-vite', options: {} },
  core: { disableTelemetry: true },
  async viteFinal(config) {
    // Storybook is a catalog, not a production delivery entry.
    config.plugins = config.plugins.filter(plugin => plugin?.name !== 'factory-delivery-graph');
    return config;
  },
};
