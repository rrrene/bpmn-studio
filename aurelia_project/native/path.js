if (window.nodeRequire) {
  define('path', function() {
    return window.nodeRequire('path');
  });
} else {
  define('path', function() {
    return;
  });
}
