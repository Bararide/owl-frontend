const IS_DEV = process.env.NODE_ENV === 'development';

module.exports = {
  webpack: {
    configure: (config) => {
      config.output.publicPath = '/';
      return config;
    },
  },
  devServer: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: 'all',
    
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Content-Security-Policy': IS_DEV
        ? `default-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data:; connect-src 'self' ws://localhost:* ws://container-hub.local:* http://localhost:* http://container-hub.local:*;`
        : undefined,
    },
    
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
    
    client: {
      webSocketURL: {
        hostname: '0.0.0.0',
        port: 3000,
      },
    },
  },
};