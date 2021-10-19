const { whenDev } = require('@craco/craco');
const CracoEsbuildPlugin = require('craco-esbuild');
const SimpleProgressWebpackPlugin = require('simple-progress-webpack-plugin');
const CircularDependencyPlugin = require('circular-dependency-plugin');
const CracoLessPlugin = require('craco-less');

const path = require('path');
const pathResolve = (pathUrl) => path.join(__dirname, pathUrl);
module.exports = {
  webpack: {
    configure: {
      output: {
        filename: 'static/js/bundle.js',
      },
      optimization: {
        runtimeChunk: false,
        splitChunks: {
          chunks(chunk) {
            return false;
          },
        },
      },
    },
    alias: {
      '@': pathResolve('.'),
      src: pathResolve('src'),
      common: pathResolve('src/common'),
      components: pathResolve('src/components'),
      hooks: pathResolve('src/hooks'),
      utils: pathResolve('src/utils'),
    },
    plugins: [
      new SimpleProgressWebpackPlugin({
        format: 'compact',
      }),
      ...whenDev(
        () => [
          new CircularDependencyPlugin({
            exclude: /node_modules/,
            include: /src/,
            failOnError: true,
            allowAsyncCycles: false,
            cwd: process.cwd(),
          }),
        ],
        []
      ),
    ],
  },
  plugins: [
    {
      plugin: CracoEsbuildPlugin,
    },
    {
      plugin: CracoLessPlugin,
      options: {
        lessLoaderOptions: {
          lessOptions: {
            javascriptEnabled: true,
          },
        },
      },
    },
  ],
};
