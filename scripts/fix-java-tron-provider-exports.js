const fs = require('fs');
const path = require('path');

const providerPackagePath = path.join(
  __dirname,
  '..',
  'node_modules',
  '@intercroneswap',
  'java-tron-provider',
  'package.json',
);

const tronWebPackagePath = path.join(__dirname, '..', 'node_modules', 'tronweb', 'package.json');
const sdkPackagePath = path.join(__dirname, '..', 'node_modules', '@intercroneswap', 'v2-sdk', 'package.json');
const providerEventsApiPath = path.join(
  __dirname,
  '..',
  'node_modules',
  '@intercroneswap',
  'java-tron-provider',
  'src',
  'methods',
  'eth',
  'getLogs',
  'eventsApiGetLogs.js',
);
const providerConversionsPath = path.join(
  __dirname,
  '..',
  'node_modules',
  '@intercroneswap',
  'java-tron-provider',
  'src',
  'tron-eth-conversions',
  'index.js',
);

function fixedExports() {
  return {
    '.': {
      // The package declares `type: module`, so its CommonJS .js files cannot
      // safely execute in a browser bundle (`exports is not defined`). The full
      // ESM entry includes the provider plus the address conversion helpers.
      browser: './src/index.js',
      node: {
        import: './src/index.node.js',
        require: './commonjs/lib/index.node.js',
      },
      import: './src/index.js',
      require: './commonjs/lib/index.js',
      default: './src/index.js',
    },
    './package.json': './package.json',
  };
}

if (!fs.existsSync(providerPackagePath)) {
  console.warn('[postinstall] java-tron-provider is not installed; export fix skipped.');
} else {
  const providerPackageJson = JSON.parse(fs.readFileSync(providerPackagePath, 'utf8'));
  const expectedExports = fixedExports();
  const providerAlreadyFixed = JSON.stringify(providerPackageJson.exports) === JSON.stringify(expectedExports);

  if (!providerAlreadyFixed) {
    providerPackageJson.exports = expectedExports;
    fs.writeFileSync(providerPackagePath, `${JSON.stringify(providerPackageJson, null, 2)}\n`);
    console.log('[postinstall] Fixed @intercroneswap/java-tron-provider browser exports.');
  }
}

if (fs.existsSync(providerEventsApiPath)) {
  const eventsApiSource = fs.readFileSync(providerEventsApiPath, 'utf8');
  const browserSource = eventsApiSource.replace('from "querystring"', 'from "querystring-es3"');
  if (browserSource !== eventsApiSource) {
    fs.writeFileSync(providerEventsApiPath, browserSource);
    console.log('[postinstall] Selected the browser querystring implementation.');
  }
}

if (fs.existsSync(providerConversionsPath)) {
  const conversionsSource = fs.readFileSync(providerConversionsPath, 'utf8');
  const validSource = conversionsSource.replace(/},\s*$/, '};\n');
  if (validSource !== conversionsSource) {
    fs.writeFileSync(providerConversionsPath, validSource);
    console.log('[postinstall] Fixed invalid ESM syntax in the address helpers.');
  }
}

if (!fs.existsSync(tronWebPackagePath)) {
  console.warn('[postinstall] tronweb is not installed; browser entry fix skipped.');
} else {
  const tronWebPackageJson = JSON.parse(fs.readFileSync(tronWebPackagePath, 'utf8'));

  // TronWeb 3.x ships a Webpack-built browser bundle but does not declare it.
  // Without this field, Webpack 5 consumes TronWeb.node.js and asks for removed
  // Node core polyfills such as querystring.
  if (tronWebPackageJson.browser !== './dist/TronWeb.js') {
    tronWebPackageJson.browser = './dist/TronWeb.js';
    fs.writeFileSync(tronWebPackagePath, `${JSON.stringify(tronWebPackageJson, null, 2)}\n`);
    console.log('[postinstall] Selected the TronWeb browser bundle for Webpack.');
  }
}

if (!fs.existsSync(sdkPackagePath)) {
  console.warn('[postinstall] v2-sdk is not installed; CommonJS entry fix skipped.');
} else {
  const sdkPackageJson = JSON.parse(fs.readFileSync(sdkPackagePath, 'utf8'));

  // The published ESM bundle imports `abi` as a named export from legacy
  // Truffle JSON artifacts, which Webpack 5 rejects. The SDK's CommonJS build
  // contains the same implementation with those artifacts already bundled.
  if (sdkPackageJson.module !== './dist/index.js') {
    sdkPackageJson.module = './dist/index.js';
    fs.writeFileSync(sdkPackagePath, `${JSON.stringify(sdkPackageJson, null, 2)}\n`);
    console.log('[postinstall] Selected the v2-sdk CommonJS bundle for Webpack 5.');
  }
}
