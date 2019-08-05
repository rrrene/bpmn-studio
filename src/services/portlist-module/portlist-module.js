const {ReleaseChannel} = require('../release-channel-service/release-channel-service');

module.exports.getPortList = function(defaultPort) {
  const portList = [];

  for (let index = 0; index < 10; index++) {
    portList.push(defaultPort + index * 10);
  }

  return portList;
};
