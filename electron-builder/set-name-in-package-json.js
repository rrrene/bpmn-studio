const fs = require('fs');

const {getReleaseChannelForElectron} = require('./getReleaseChannelForElectron');

const releaseChannel = getReleaseChannelForElectron();

fs.readFile('package.json', 'utf8', (err, data) => {
  if (err) {
    throw err;
  }

  const dataWithNewName = data.replace('  "name": "bpmn-studio",', `  "name": "bpmn-studio-${releaseChannel}",`);

  fs.writeFile('package.json', dataWithNewName, (errWrite) => {
    if (errWrite) {
      throw errWrite;
    }

    console.log('[set-name-in-package-json]\tcomplete');
  });
});
