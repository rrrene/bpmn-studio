if (window.nodeRequire) {
  define('fs', function() {
    return window.nodeRequire('fs');
  });
} else {
  define('fs', function() {
    return;
  });
}
