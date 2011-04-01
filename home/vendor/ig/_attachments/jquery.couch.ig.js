(function() {
  (function($) {
    var cache, debugMode, defaultCallback, ig, listeners, notifyUI, selectedSpo, _ref;
    ig = (_ref = $.ig) != null ? _ref : $.ig = {};
    debugMode = true;
    selectedSpo = [];
    notifyUI = function() {};
    cache = new LRUCache(100);
    listeners = {};
    return defaultCallback = function(whatever) {
      return l("defaultCallback: " + whatever);
    };
  })(jQuery);
}).call(this);
