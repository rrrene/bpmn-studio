const isDev = require('electron-is-dev');
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
}

module.exports = {
  ReleaseChannel,
};
