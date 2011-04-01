(($)->
  ig = $.ig ?= {}
  debugMode = on
  selectedSpo = []
  notifyUI = ->
  cache = new LRUCache 100
  listeners = {}
  defaultCallback = (whatever)->
    l "defaultCallback: #{whatever}"
)(jQuery)
