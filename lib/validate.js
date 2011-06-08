var app_types, deepCheck, hasProperty, types;
types = require('kanso/types');
app_types = require('./types');
hasProperty = function(field, context, message) {
  var prop, _i, _len, _ref, _results;
  message != null ? message : message = "" + context.type + " missing a " + field;
  _ref = field.split(".");
  _results = [];
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    prop = _ref[_i];
    if (!context[prop]) {
      throw {
        forbidden: message
      };
    }
    _results.push(context = context[prop]);
  }
  return _results;
};
deepCheck = function(spo_id, alldocs) {
  var spo;
  spo = alldocs[spo_id];
  if (spo.type === "item") {
    return hasProperty("value", spo);
  } else if (spo.type === "relation") {
    hasProperty("subject", spo);
    hasProperty("predicate", spo);
    hasProperty("object", spo);
    deepCheck(spo.subject, alldocs);
    deepCheck(spo.predicate, alldocs);
    return deepCheck(spo.object, alldocs);
  } else {
    throw {
      forbidden: "not an item or relation"
    };
  }
};
module.exports = function(newDoc, oldDoc, userCtx) {
  types.validate_doc_update(app_types, newDoc, oldDoc, userCtx);
  return deepCheck(newDoc, doc.docs);
};