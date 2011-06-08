exports.sentences = {
  map: function(doc) {
    if (doc.type === "relation" && doc.sentence === "yes") {
      return emit(null, null);
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
    var i, shorten, str, _ref, _results;
    shorten = function(str, options) {
      var i, l, lastChar;
      options != null ? options : options = {};
      if (str == null) {
        throw "shortenItem needs str";
      }
      str = str.trim().replace(/\s+/g, ' ');
      if (options.onlyTrim) {
        return str;
      } else {
        i = 1;
        lastChar = str.charAt(0);
        l = str.length;
        while (i < l) {
          if (str.charAt(i) === lastChar) {
            str = str.substr(0, i) + str.slice(i).replace(lastChar, '');
            i -= 1;
            l -= 1;
          }
          lastChar = str.charAt(i);
          i += 1;
        }
        str = str.replace(/[aeiou ]/g, '');
        return str;
      }
    };
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