/* eslint-disable no-undef */
if (window.nodeRequire) {
  define('util', () => {
    return window.nodeRequire('util');
  });
} else {
  define('util', () => {});
}
