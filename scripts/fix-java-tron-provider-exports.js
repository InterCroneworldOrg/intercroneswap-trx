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

function fixedExports() {
  return {
    '.': {
      // The dedicated web entry omits helpers such as ethAddress which the
      // interface imports. The complete CommonJS entry exports both the
      // provider factory and address helpers. TronWeb itself is redirected to
      // its browser bundle below, so the complete entry remains browser-safe.
      browser: './commonjs/lib/index.js',
      node: {
        import: './src/index.node.js',
        require: './commonjs/lib/index.node.js',
      },
      import: './src/index.js',
      require: './commonjs/lib/index.js',
      default: './commonjs/lib/index.js',
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
