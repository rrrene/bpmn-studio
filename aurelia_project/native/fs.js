/* eslint-disable no-undef */
if (window.nodeRequire) {
  define('fs', () => {
    return window.nodeRequire('fs');
  });
} else {
  define('fs', () => {});
}
