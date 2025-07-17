(function(){
  function waitForAssets() {
    if (window.imageLoaded && window.framesLoaded) {
      loadMenu(); // lo trae notes.js
      loop();     // lo trae notes.js
    } else {
      setTimeout(waitForAssets, 100);
    }
  }
  waitForAssets();
})();