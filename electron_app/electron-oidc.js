
const queryString = require('querystring');
const fetch = require('node-fetch');
const nodeUrl = require('url');
const electron = require('electron');
const crypto = require('crypto');

const BrowserWindow = electron.BrowserWindow || electron.remote.BrowserWindow;

module.exports = function (config, windowParams) {
  function getTokenObject(authorityUrl) {
    // Build the Url Params from the Config.
    const urlParams = {
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: config.responseType,
      scope: config.scope,
      state: _getRandomString(16),
      nonce: _getRandomString(16),
    };

    const url = `${authorityUrl}connect/authorize?${queryString.stringify(urlParams)}`;

    return new Promise(((resolve, reject) => {
      // Open a new browser window and load the previously constructed url.
      const authWindow = new BrowserWindow(windowParams || {'use-content-size': true});

      authWindow.loadURL(url);
      authWindow.show();

      // Reject the Promise when the user closes the new window.
      authWindow.on('closed', () => {
        reject(new Error('window was closed by user'));
      });

      // Handle the different callbacks.
      function onCallback(url) {
        // Parse callback url into its parts.
        const url_parts = nodeUrl.parse(url, true);
        const href = url_parts.href;
        const error = url_parts.error;

        /**
         * If there was an error:
         * - Reject the promise with the error.
         * - Close the window.
         *
         * If the href includes the callback uri:
         * - Load that href in the window.
         *
         * If the href includes the specified redirect uri:
         * - Parse the hash into its parts.
         * - Add those parts to new object.
         * - Resolve the promise with this object.
         * - Close the window.
         */
        if (error !== undefined) {
          reject(error);
          authWindow.removeAllListeners('closed');
          setImmediate(() => {
            authWindow.close();
          });
        } else if (href.includes('/connect/authorize/callback')) {
          authWindow.loadURL(href);
        } else if (href.includes(config.redirectUri)) {
          const identityParameter = url_parts.hash;
          const parameterAsArray = identityParameter.split('&');

          const idToken = parameterAsArray[0].split('=')[1];
          const accessToken = parameterAsArray[1].split('=')[1];

          const tokenObject = {
            idToken,
            accessToken,
          };

          resolve(tokenObject);
          authWindow.removeAllListeners('closed');

          setImmediate(() => {
            authWindow.close();
          });
        }
      }

      /**
       * This will trigger everytime the new window will redirect.
       * Important: Not AFTER it redirects but BEFORE.
       * This gives us the possibility to intercept the redirect to
       * the specified redirect uri, which would lead to faulty behaviour
       * due to security aspects in chromium.
       *
       * If that redirect would start we stop it by preventing the default
       * behaviour and instead parse its parameters in the
       * "onCallback"-function.
       */
      authWindow.webContents.on('will-redirect', (event, url) => {
        if (url.includes(config.redirectUri)) {
          event.preventDefault();
        }

        onCallback(url);
      });
    }));
  }

  function logout(tokenObject, authorityUrl) {
    const urlParams = {
      id_token_hint: tokenObject.userId,
      post_logout_redirect_uri: config.logoutRedirectUri,
    };

    const endSessionUrl = `${authorityUrl}connect/endsession?${queryString.stringify(urlParams)}`;

    return new Promise((async (resolve, reject) => {
      const response = await fetch(endSessionUrl);

      const logoutWindow = new BrowserWindow(windowParams || {'use-content-size': true});

      logoutWindow.webContents.on('will-navigate', (event, url) => {
        if (url.includes(config.logoutRedirectUri)) {
          event.preventDefault();
          resolve(true);
          logoutWindow.close();
        }
      });

      logoutWindow.on('closed', () => {
        resolve(true);
      });

      logoutWindow.loadURL(response.url);
      logoutWindow.show();
    }));
  }

  function _getRandomString(length) {
    const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._~';
    let result = '';

    while (length > 0) {
      const randomValues = crypto.randomBytes(length);

      randomValues.forEach((value) => {
        if (length == 0) {
          return;
        }

        if (value < charset.length) {
          result += charset[value];
          length--;
        }
      });
    }
    return result;
  }

  return {
    getTokenObject: getTokenObject,
    logout: logout,
  };
};
