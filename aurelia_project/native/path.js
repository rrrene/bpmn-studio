if (window.nodeRequire) {
  define('path', () => {
    return window.nodeRequire('path');
  });
} else {
  define('path', () => {

  });
}
