const packageVersion = require('./../package.json').version;

function getReleaseChannelForElectron() {
  let releaseChannel = 'stable';
  if (packageVersion.match(/-alpha\./)) {
    releaseChannel = 'alpha';
  }
  if (packageVersion.match(/-beta\./)) {
    releaseChannel = 'beta';
  }
  return releaseChannel;
}

exports.getReleaseChannelForElectron = getReleaseChannelForElectron;
