const packageVersion = require('./../package.json').version;

function getReleaseChannel() {
  let releaseChannel = 'stable';
  if (packageVersion.match(/-alpha\./)) {
    releaseChannel = 'alpha';
  }
  if (packageVersion.match(/-beta\./)) {
    releaseChannel = 'beta';
  }
  return releaseChannel;
}

function getReleaseChannelSuffix() {
  let releaseChannel = '-dev';
  if (packageVersion.match(/-alpha\./)) {
    releaseChannel = '-alpha';
  }
  if (packageVersion.match(/-beta\./)) {
    releaseChannel = '-beta';
  }
  if (packageVersion.match(/-/) == null) {
    releaseChannel = '';
  }
  return releaseChannel;
}

exports.getReleaseChannel = getReleaseChannel;
exports.getReleaseChannelSuffix = getReleaseChannelSuffix;
