module.exports = {
    presets: [
      ['@babel/preset-env', { targets: { node: 'current' } }], // Transpile modern JS for the current Node.js version
      '@babel/preset-typescript', // Add TypeScript support
    ],
  };