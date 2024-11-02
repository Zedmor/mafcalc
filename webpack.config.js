module.exports = {
  // ... other configurations
  module: {
    rules: [
      // ... other rules
      {
        test: /\.md$/,
        use: 'raw-loader',
      },
    ],
  },
};