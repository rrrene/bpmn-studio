if (window.nodeRequire) {
  define('os', () => {
    return window.nodeRequire('os');
  });
} else {
  define('os', () => {

  });
}
