const fs = require('fs');

const {getReleaseChannelForElectron} = require('./getReleaseChannelForElectron');

const releaseChannel = getReleaseChannelForElectron();

fs.readFile('package.json', 'utf8', (err, data) => {
  if (err) {
    throw err;
  }

  const dataWithNewName = data.replace(`  "name": "bpmn-studio-${releaseChannel}",`, '  "name": "bpmn-studio",');

  fs.writeFile('package.json', dataWithNewName, (errWrite) => {
    if (errWrite) {
      throw errWrite;
    }

    console.log('[reset-name-in-package-json]\tcomplete');
  });
});
