if (window.nodeRequire) {
  define('util', function() {
    return window.nodeRequire('util');
  });
} else {
  define('util', function() {
    return;
  });
}
