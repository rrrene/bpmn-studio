const studioVersion = require('../../../package.json').version;

const {ReleaseChannel} = require('../release-channel-service/release-channel-service');
const releaseChannel = new ReleaseChannel(studioVersion);

function getPortList(defaultPort) {
  const portList = [];

  for (let index = 0; index < 10; index++) {
    portList.push(defaultPort + index * 10);
  }

  return portList;
}

module.exports.getDefaultPorts = function() {
  if (releaseChannel.isDev()) {
    return getPortList(56300);
  }
  if (releaseChannel.isAlpha()) {
    return getPortList(56200);
  }
  if (releaseChannel.isBeta()) {
    return getPortList(56100);
  }
  if (releaseChannel.isStable()) {
    return getPortList(56000);
  }
  throw new Error('Could not get default port for internal process engine');
};
