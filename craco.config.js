module.exports = {
  webpack: {
    configure: (config) => {
      config.output.publicPath = '/';
      return config;
    },
  },
  devServer: {
    host: '127.0.0.1',
    port: 3000,
    allowedHosts: 'all',
  },
};