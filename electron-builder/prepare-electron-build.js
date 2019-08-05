const fs = require('fs');

const {getReleaseChannelForElectron} = require('./getReleaseChannelForElectron');

function copyFile(fromFile, toFile) {
  console.log(`Copying ${fromFile} to ${toFile}`);
  const errorCallback = (err) => console.error(err);
  fs.copyFile(fromFile, toFile, errorCallback);
}

const releaseChannel = getReleaseChannelForElectron();

copyFile(`electron-builder/${releaseChannel}/electron-builder.yml`, 'build/electron-builder.yml');
copyFile(`electron-builder/${releaseChannel}/icon.png`, 'build/icon.png');
copyFile(`electron-builder/${releaseChannel}/icon.icns`, 'build/icon.icns');
