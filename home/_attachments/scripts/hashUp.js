var check, query;
query = function(spo) {
  var x, _i, _len, _ref, _results;
  if (spo === null || spo.isNull) {
    return null;
  } else if (spo.type === "item") {
    return spo.value;
  } else if (spo.type === "relation") {
    _ref = ["subject", "predicate", "object"];
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      x = _ref[_i];
      _results.push(query(spo[x]));
    }
    return _results;
  }
};
check = function(doc, emit) {
  var R, emitAnswer, more, prepare, shiftNull, spoAt;
  spoAt = ["subject", "predicate", "object"];
  prepare = function(spo, parent) {
    spo.currentIndex = spo.nullIndex = -1;
    spo.isNull = false;
    spo.parent = parent;
    if (spo.type === "relation") {
      prepare(spo.subject, spo);
      prepare(spo.predicate, spo);
      return prepare(spo.object, spo);
    }
  };
  emitAnswer = function() {
    var q;
    q = query(R);
    cl("" + R[spoAt[R.nullIndex]] + " answers " + (JSON.stringify(q)));
    return emit(q, R[spoAt[R.nullIndex]]);
  };
  shiftNull = function(r) {
    if (r === false) {
      /* meaning shiftNull was called on R.up (boundary condition) */
      return cl("done making answers");
    } else {
      r.currentIndex = 0;
      if (r.nullIndex === -1) {
        r.nullIndex = 0;
        r.subject.isNull = true;
        emitAnswer();
        return more(r);
      } else if (r.nullIndex < 2) {
        r[spoAt[r.nullIndex]].isNull = false;
        r.nullIndex += 1;
        r[spoAt[r.nullIndex]].isNull = true;
        emitAnswer();
        return more(r);
      } else if (r.nullIndex === 2) {
        r[spoAt[r.nullIndex]].isNull = false;
        r.nullIndex = -1;
        return shiftNull(r.parent);
      }
    }
  };
  more = function(r) {
    if (r.nullIndex === -1) {
      return shiftNull(r);
    } else if (r.currentIndex === r.nullIndex) {
      r.currentIndex += 1;
      return more(r);
    } else if (r.currentIndex === 3) {
      return shiftNull(r);
    } else if (r[spoAt[r.currentIndex]].type === "item") {
      r.currentIndex += 1;
      return more(r);
    } else if (r[spoAt[r.currentIndex]].type === "relation") {
      return more(r[spoAt[r.currentIndex]]);
    }
  };
  R = doc;
  prepare(doc, false);
  return more(R);
};