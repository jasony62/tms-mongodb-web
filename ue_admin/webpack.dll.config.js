const { library } = require('./dll.config')
const path = require('path')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const { DllPlugin } = require('webpack')

module.exports = {
  mode: 'development',
  entry: {
    ...library
  },
  output: {
    library: '[name]_[hash:4]',
    path: path.resolve(__dirname, 'dll'),
    filename: '[name].dll.js'
  },
  plugins: [
    new CleanWebpackPlugin(),
    new DllPlugin({
      path: path.resolve(__dirname, 'dll', '[name].manifest.json'),
      name: '[name]_[hash:4]'
    })
  ]
}
