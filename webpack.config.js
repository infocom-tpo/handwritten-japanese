const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: './src/main.ts',
  output: {
    path: path.resolve(__dirname, 'docs/scripts'),
    filename: 'main.js',
  },
  devtool: 'inline-source-map',
  module: {
    rules: [{
      test: /\.ts$/,
      exclude: /node_modules/,
      loader: 'ts-loader',
    }],
  },
  resolve: {
    extensions: [
      '.ts', '.js',
    ],
  },
  devServer: {
    hot: true,
    publicPath: '/scripts/',
    contentBase: path.resolve(__dirname, 'docs'),
    // host: '0.0.0.0',
    // useLocalIp: true,
    watchContentBase: true,
    clientLogLevel: 'silent',
    noInfo: true,
  },
  optimization: {
    minimizer: [new TerserPlugin({
      extractComments: false,
    })],
  },
};