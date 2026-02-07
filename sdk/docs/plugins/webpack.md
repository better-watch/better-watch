# Webpack Plugin

Integrate TraceInject into your Webpack build process.

## Installation

```bash
npm install --save-dev @trace-inject/webpack-plugin
```

## Basic Configuration

Add the plugin to your `webpack.config.js`:

```javascript
const TraceInjectPlugin = require('@trace-inject/webpack-plugin');

module.exports = {
  entry: './src/index.ts',
  output: {
    filename: 'bundle.js',
    path: __dirname + '/dist'
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader'
      }
    ]
  },
  plugins: [
    new TraceInjectPlugin({
      configPath: './tracepoint-config.json'
    })
  ]
};
```

## Configuration Options

```javascript
new TraceInjectPlugin({
  // Path to configuration file
  configPath: './tracepoint-config.json',

  // Enable/disable plugin
  enabled: true,

  // Environment
  environment: 'production',

  // Remote configuration
  remoteConfig: {
    enabled: false,
    endpoint: 'https://config.example.com/api/config'
  },

  // Verbose logging
  verbose: false
})
```

## Full Example

Complete Webpack configuration with TraceInject:

```javascript
const path = require('path');
const TraceInjectPlugin = require('@trace-inject/webpack-plugin');

module.exports = {
  mode: 'production',
  entry: './src/index.ts',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    sourceMapFilename: '[name].js.map'
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  devtool: 'source-map',
  plugins: [
    new TraceInjectPlugin({
      configPath: './tracepoint-config.json',
      verbose: true
    })
  ],
  resolve: {
    extensions: ['.ts', '.js']
  }
};
```

## Webpack with Next.js

In `next.config.js`:

```javascript
const TraceInjectPlugin = require('@trace-inject/webpack-plugin');

module.exports = {
  webpack: (config, { isServer }) => {
    config.plugins.push(
      new TraceInjectPlugin({
        configPath: './tracepoint-config.json',
        enabled: isServer
      })
    );
    return config;
  }
};
```

## Environment-Specific Configuration

```javascript
const TraceInjectPlugin = require('@trace-inject/webpack-plugin');

const traceInjectConfig = {
  configPath: './tracepoint-config.json'
};

if (process.env.NODE_ENV === 'production') {
  traceInjectConfig.environment = 'production';
}

module.exports = {
  plugins: [
    new TraceInjectPlugin(traceInjectConfig)
  ]
};
```

## Development vs Production

For development, you might want different settings:

```javascript
new TraceInjectPlugin({
  configPath: process.env.NODE_ENV === 'development'
    ? './tracepoint-config.dev.json'
    : './tracepoint-config.json',
  enabled: process.env.NODE_ENV === 'production'
})
```

## Source Maps

Ensure source maps are enabled to map traces back to original source:

```javascript
module.exports = {
  devtool: 'source-map',
  plugins: [
    new TraceInjectPlugin({
      configPath: './tracepoint-config.json'
    })
  ]
};
```

## Hot Module Replacement

TraceInject works with HMR:

```javascript
module.exports = {
  devServer: {
    hot: true,
    port: 3000
  },
  plugins: [
    new TraceInjectPlugin({
      configPath: './tracepoint-config.json'
    })
  ]
};
```

## Troubleshooting

### Plugin not found

Make sure you've installed both packages:

```bash
npm install --save-dev @trace-inject/core @trace-inject/webpack-plugin
```

### Configuration file not found

Verify the `configPath` is correct and relative to your project root:

```javascript
// Wrong
configPath: '../config.json'

// Right
configPath: './tracepoint-config.json'
```

### Source maps not generated

Enable source map generation:

```javascript
module.exports = {
  devtool: 'source-map'
};
```

### Performance issues

If the build is slow:

1. Disable the plugin in development:
   ```javascript
   enabled: process.env.NODE_ENV === 'production'
   ```

2. Reduce the number of tracepoints

3. Use glob patterns more carefully

## Performance Tips

1. **Cache results** - Webpack caches build results automatically
2. **Limit tracepoints** - Fewer tracepoints = faster builds
3. **Production only** - Disable for development builds
4. **Specific patterns** - Use specific file patterns instead of `**/*.ts`
