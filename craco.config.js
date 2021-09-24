const { whenDev } = require('@craco/craco');
const WebpackBar = require('webpackbar');
const SimpleProgressWebpackPlugin = require('simple-progress-webpack-plugin');
const CircularDependencyPlugin = require('circular-dependency-plugin');
const path = require('path');
const pathResolve = (pathUrl) => path.join(__dirname, pathUrl);
module.exports = {
  webpack: {
    alias: {
      '@': pathResolve('.'),
      src: pathResolve('src'),
      common: pathResolve('src/common'),
      components: pathResolve('src/components'),
      hooks: pathResolve('src/hooks'),
      utils: pathResolve('src/utils'),
    },
    plugins: [
      new WebpackBar(),
      new SimpleProgressWebpackPlugin({
        format: 'compact',
      }),
      ...whenDev(() => [
        new CircularDependencyPlugin({
          exclude: /node_modules/,
          include: /src/,
          failOnError: true,
          allowAsyncCycles: false,
          cwd: process.cwd(),
        }),
      ]),
    ],
  },
};
