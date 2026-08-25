const fs = require('fs');
const path = require('path');

const packagePath = path.join(
  __dirname,
  '..',
  'node_modules',
  '@intercroneswap',
  'java-tron-provider',
  'package.json',
);

function fixedExports() {
  return {
    '.': {
      browser: './commonjs/lib/index.web.js',
      node: {
        import: './src/index.node.js',
        require: './commonjs/lib/index.node.js',
      },
      import: './src/index.web.js',
      require: './commonjs/lib/index.web.js',
      default: './commonjs/lib/index.web.js',
    },
    './package.json': './package.json',
  };
}

if (!fs.existsSync(packagePath)) {
  console.warn('[postinstall] java-tron-provider is not installed; export fix skipped.');
  process.exit(0);
}

const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const alreadyFixed = packageJson.exports && packageJson.exports['.'];

if (!alreadyFixed) {
  packageJson.exports = fixedExports();
  fs.writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
  console.log('[postinstall] Fixed @intercroneswap/java-tron-provider browser exports.');
}
