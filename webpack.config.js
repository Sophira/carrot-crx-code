var webpack = require('webpack');
var ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = {
    entry: {
        content: ['./js/content/main.js'],
        background: ['./js/background/main.js'],
        popup: ['./js/popup/main.js']
    },
    output: {
        path: __dirname + '/build/',
        filename: '[name].js'
    },
    module: {
        loaders: [
            { test: /\.css$/, loader: ExtractTextPlugin.extract('style-loader', 'css-loader') },
            { test: /\.jsx?$/, exclude: /node_modules/, loader: 'babel-loader'},

            { test: /\.jpg/, loader: 'file-loader?name=/img/[name].[ext]&minetype=image/jpg' },
            { test: /\.jpeg/, loader: 'file-loader?name=/img/[name].[ext]&minetype=image/jpg' },
            { test: /\.png/, loader: 'file-loader?name=/img/[name].[ext]&minetype=image/png' },
            { test: /\.gif/, loader: 'file-loader?name=/img/[name].[ext]&minetype=image/gif' },

            { test: /\.scss$/, loader: ExtractTextPlugin.extract('css!sass') }
        ]
    },
    plugins: [
        new ExtractTextPlugin('../build/[name].css', { allChunks: true })
    ]
};
