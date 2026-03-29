const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  target: 'web',
  entry: {
    agentPanel: './src/webviews/agentPanel.tsx',
    marketplace: './src/webviews/marketplace.tsx',
    coordinationDashboard: './src/webviews/coordinationDashboard.tsx',
    spiralBuilder: './src/webviews/spiralBuilder.tsx',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    libraryTarget: 'umd',
    globalObject: 'this',
  },
  devtool: 'source-map',
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
            },
          },
        ],
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './template.html',
      filename: 'index.html',
      chunks: ['agentPanel'],
    }),
    new HtmlWebpackPlugin({
      template: './template.html',
      filename: 'marketplace.html',
      chunks: ['marketplace'],
    }),
    new HtmlWebpackPlugin({
      template: './template.html',
      filename: 'coordination.html',
      chunks: ['coordinationDashboard'],
    }),
    new HtmlWebpackPlugin({
      template: './template.html',
      filename: 'spiral.html',
      chunks: ['spiralBuilder'],
    }),
  ],
  externals: {
    vscode: 'commonjs vscode',
  },
};
