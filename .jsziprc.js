const pkg = require('./package.json');
const distZipFile = `${pkg.name}.zip`;

module.exports = {
  entries: [
    '.ebextensions/',
    'package.json',
    'dist/',
    'fonts/'
  ],
  force: true,
  ignoreEntries: [
    '.DS_Store'
  ],
  mode: 'add',
  outputEntry: `zip/${distZipFile}`,
};
