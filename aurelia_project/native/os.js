if (window.nodeRequire) {
  define('os', function() {
    return window.nodeRequire('os');
  });
} else {
  define('os', function() {
    return;
  });
}
