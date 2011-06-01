var shorten;
shorten = require("./item").shorten;
exports.sentences = {
  map: function(doc) {
    if (doc.type === "relation" && doc.sentence === "yes") {
      return emit(doc._id, null);
    }
  }
};
exports.relations = {
  map: function(doc) {
    if (doc.type === "relation") {
      emit([doc.subject, "s"], null);
      emit([doc.predicate, "p"], null);
      return emit([doc.object, "o"], null);
    }
  }
};
exports.itemSuggestions = {
  map: function(doc) {
    var i, str, _ref, _results;
    if (doc.type === "item") {
      str = shorten(doc.value);
      _results = [];
      for (i = 0, _ref = str.length; (0 <= _ref ? i < _ref : i > _ref); (0 <= _ref ? i += 1 : i -= 1)) {
        _results.push(emit(str.slice(i), null));
      }
      return _results;
    }
  }
};
exports.allItems = {
  map: function(doc) {
    if (doc.type === "item") {
      return emit(doc.value, null);
    }
  }
};