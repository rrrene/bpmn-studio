const isDev = require('electron-is-dev');
const {getPortList} = require('../portlist-module/portlist-module');

class ReleaseChannel {
  constructor(version) {
    this.version = version;
  }

  isDev() {
    return isDev;
  }

  isAlpha() {
    return this.version.includes('alpha');
  }

  isBeta() {
    return this.version.includes('beta');
  }

  isStable() {
    return !this.isDev() && !this.isAlpha() && !this.isBeta();
  }

  getName() {
    if (this.isDev()) {
      return 'dev';
    } else if (this.isAlpha()) {
      return 'alpha';
    } else if (this.isBeta()) {
      return 'beta';
    } else if (this.isStable()) {
      return 'stable';
    }
  }

  getDefaultPorts() {
    if (this.isDev()) {
      return getPortList(56000);
    }
    if (this.isAlpha()) {
      return getPortList(56100);
    }
    if (this.isBeta()) {
      return getPortList(56200);
    }
    if (this.isStable()) {
      return getPortList(56300);
    }
    throw new Error('Could not get default port for internal process engine');
  }

  getConfigPathSuffix() {
    if (this.isDev()) {
      return '-dev';
    }
    if (this.isAlpha()) {
      return '-alpha';
    }
    if (this.isBeta()) {
      return '-beta';
    }
    if (this.isStable()) {
      return '';
    }
    throw new Error('Could not get config path suffix for internal process engine');
  }

  getConfigPath() {
    return `bpmn-studio${this.getConfigPathSuffix()}`;
  }
}

module.exports = {
  ReleaseChannel,
};
