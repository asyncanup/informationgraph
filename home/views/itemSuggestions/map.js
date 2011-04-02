(function(doc) {
  // !code _attachments/scripts/shortenItem.js
  ;  var i, str, _ref, _results;
  if (doc.type === "item") {
    str = shortenItem(doc.value);
    _results = [];
    for (i = 0, _ref = str.length; (0 <= _ref ? i < _ref : i > _ref); (0 <= _ref ? i += 1 : i -= 1)) {
      _results.push(emit(str.slice(i), null));
    }
    return _results;
  }
});