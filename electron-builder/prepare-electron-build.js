const fs = require('fs');
const packageVersion = require('./../package.json').version;

let electronBuilderEnv = 'stable';

if (packageVersion.match(/-alpha\./)) {
  electronBuilderEnv = 'alpha';
}

if (packageVersion.match(/-beta\./)) {
  electronBuilderEnv = 'beta';
}

function copyFile(fromFile, toFile) {
  console.log(`Copying ${fromFile} to ${toFile}`);
  const errorCallback = (err) => console.error(err);
  fs.copyFile(fromFile, toFile, errorCallback);
}

copyFile(`electron-builder/${electronBuilderEnv}/electron-builder.yml`, 'build/electron-builder.yml');
copyFile(`electron-builder/${electronBuilderEnv}/icon.png`, 'build/icon.png');
copyFile(`electron-builder/${electronBuilderEnv}/icon.icns`, 'build/icon.icns');
