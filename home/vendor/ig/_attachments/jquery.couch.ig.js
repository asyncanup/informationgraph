(function() {
  var __indexOf = Array.prototype.indexOf || function(item) {
    for (var i = 0, l = this.length; i < l; i++) {
      if (this[i] === item) return i;
    }
    return -1;
  };
  (function(jQuery) {
    var $, cache, couchDoc, couchError, db, debugMode, defaultCallback, guiDocSelect, guiDocUnSelect, hashUp, hose, ig, l, listeners, notifyUI, refreshDoc, selectedSpo, timestamp, _ref;
    $ = jQuery;
    ig = (_ref = $.ig) != null ? _ref : $.ig = {};
    db = null;
    debugMode = true;
    selectedSpo = [];
    notifyUI = function() {};
    cache = new LRUCache(100);
    hose = null;
    listeners = {};
    defaultCallback = function(whatever) {
      return l("defaultCallback: " + whatever);
    };
    refreshDoc = function(whatever) {
      return l("default refreshDoc: " + doc);
    };
    guiDocSelect = function(doc) {
      return l("default guiDocSelect: " + doc);
    };
    guiDocUnSelect = function(doc) {
      return l("default guiDocUnSelect: " + doc);
    };
    l = function(str) {
      if (window.console && debugMode) {
        return console.log("ig: " + val);
      }
    };
    timestamp = function() {
      return (new Date()).getTime();
    };
    couchDoc = function(doc) {
      var d;
      d = $.extend({}, doc);
      delete d.toString;
      delete d.igSelectionIndex;
      switch (d.type) {
        case "item":
          return d;
        case "relation":
          delete d.getSubject;
          delete d.getPredicate;
          delete d.getObject;
          return d;
        case "answer":
          return d;
        default:
          return d;
      }
    };
    hashUp = function(arg) {};
    couchError = function(err) {
      return function(response) {
        return ig.notify("" + err + ": " + response.reason);
      };
    };
    ig.debug = function(cmd) {
      if (cmd != null) {
        debugMode = cmd === "stop" ? false : true;
        l("debug mode on");
        return ig;
      } else {
        return debugMode;
      }
    };
    ig.database = function(dbname) {
      if (dbname == null) {
        return db;
      } else {
        db = $.couch.db(dbname);
        l("db set to " + dbname);
        hose = db.changes();
        hose.onChange(function(feed) {
          var d, _i, _len, _ref, _results;
          l("received changes");
          _ref = feed.results;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            d = _ref[_i];
            _results.push(cache.find(d.id) ? d.deleted ? (cache.remove(d.id), l("" + d.id + " deleted"), ig.refresh({
              _id: d.id,
              _deleted: true,
              toString: function() {
                return this._id;
              }
            })) : ig.doc(d.id, function(doc) {
              l("" + doc + " updated");
              return ig.refresh(doc);
            }, true) : void 0);
          }
          return _results;
        });
        l("_changes feed set up");
        return ig;
      }
    };
    ig.doc = function(id, callback, forceFetch) {
      if (id == null) {
        throw "ig.doc needs id";
      }
      if (callback == null) {
        throw "ig.doc needs a callback";
      }
      if (!forceFetch && cache.find(id)) {
        return callback(cache.get(id));
      } else {
        return db.openDoc(id, {
          success: function(d) {
            d.igSelectionIndex = 0;
            /* about whether this doc
            has been selected in GUI */
            switch (d.type) {
              case "item":
                d.toString = function() {
                  return this.value;
                };
                cache.remove(d._id);
                cache.put(d._id, d);
                l("item loaded: " + d);
                return callback(d);
              case "relation":
                return ig.doc(d.subject, function(subject) {
                  return ig.doc(d.predicate, function(predicate) {
                    return ig.doc(d.subject, function(object) {
                      d.getSubject = function() {
                        return cache.get(d.subject);
                      };
                      d.getPredicate = function() {
                        return cache.get(d.predicate);
                      };
                      d.getObject = function() {
                        return cache.get(d.object);
                      };
                      d.toString = function() {
                        return "( " + (this.getSubject()) + " - " + (this.getPredicate()) + " - " + (this.getObject()) + " )";
                      };
                      cache.remove(d._id);
                      cache.put(d._id, d);
                      l("relation loaded: " + d);
                      return callback(d);
                    });
                  });
                });
              case "answer":
                l("answer loaded: " + d._id);
                return callback(d);
            }
          },
          error: couchError("could not open document: " + id)
        });
      }
    };
    ig.search = function(view, query, callback, dontNotify) {
      if (view == null) {
        throw "search needs view";
      }
      if (callback == null) {
        throw "search needs callback";
      }
      query != null ? query : query = {};
      return db.view(view, $.extend(query, {
        success: function(data) {
          var row, _i, _len, _ref, _results;
          if (!dontNotify) {
            ig.notify("Search results: " + data.rows.length);
            if (data.rows.length === 0) {
              callback(false);
            }
            _ref = data.rows;
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              row = _ref[_i];
              _results.push(ig.doc(row.id, function(doc) {
                return callback(doc);
              }));
            }
            return _results;
          }
        },
        error: couchError("Could not run search query for " + view)
      }));
    };
    ig.notify = function(text) {
      return l(text);
    };
    ig.notification = function(f) {
      if (f == null) {
        throw "gui notification handler not specified";
      }
      ig.notify = function(text) {
        l(text);
        return f(text);
      };
      l("gui notification handler set up");
      return ig;
    };
    ig.docSelection = function(select, unselect) {
      if (select == null) {
        throw "docSelection needs gui selection handler";
      }
      if (unselect == null) {
        throw "docSelection needs gui unselection handler";
      }
      guiDocSelect = select;
      guiDocUnSelect = unselect;
      return ig;
    };
    ig.refresh = function(arg) {
      var p, refreshPlaceholder, _i, _len;
      refreshPlaceholder = function(placeholder) {
        var options, query, render, view, _ref;
        if (listeners[placeholder] == null) {
          l("refresh: " + placeholder + " is not registered");
          return false;
        } else {
          options = listeners[placeholder];
          _ref = [options.query, options.render, options.view], query = _ref[0], render = _ref[1], view = _ref[2];
          l("refresh: refreshing " + placeholder);
          if (typeof options.beforeRender == "function") {
            options.beforeRender();
          }
          return ig.search(view, query, function(doc) {
            if (!doc) {
              return l("refresh: no results in " + view + " query");
            } else {
              render(doc);
              if (doc.igSelectionIndex) {
                guiDocSelect(doc, doc.igSelectionIndex);
              } else {
                guiDocUnSelect(doc);
              }
              return l("refresh: rendered " + doc);
            }
          });
        }
      };
      switch (typeof arg) {
        case "function":
          refreshDoc = arg;
          l("refreshDoc set");
          break;
        case "string":
          l("refresh: " + arg);
          refreshPlaceholder(arg);
          break;
        case "object" && (arg.length != null) && (arg.push != null):
          for (_i = 0, _len = arg.length; _i < _len; _i++) {
            p = arg[_i];
            refreshPlaceholder(p);
          }
          break;
        case "object" && (arg.type != null):
          l("refreshDoc: " + arg);
          if (arg.igSelectionIndex) {
            guiDocSelect(arg, arg.igSelectionIndex);
          } else {
            guiDocUnSelect(arg);
          }
          break;
        default:
          l("refresh: everything");
          for (p in listeners) {
            refreshPlaceholder(p);
          }
      }
      return ig;
    };
    ig.linkPlaceholder = function(placeholder, options) {
      if (placeholder == null) {
        throw "linkPlaceholder needs placeholder";
      }
      if (options == null) {
        throw "linkPlaceholder needs options";
      }
      if (options.render == null) {
        throw "linkPlaceholder needs options.render";
      }
      if (options.view == null) {
        throw "linkPlaceholder needs options.view";
      }
      listeners[placeholder] = options;
      l("linked " + placeholder + " to " + options.view);
      ig.refresh(placeholder);
      return ig;
    };
    ig.unlinkPlaceholder = function(placeholder) {
      delete listeners[placeholder];
      ig.refresh();
      return ig;
    };
    ig.unlinkAll = function() {
      listeners = {};
      l("cleared all placeholder listeners");
      return ig;
    };
    ig.newItem = function(val, whenSaved) {
      var item;
      whenSaved != null ? whenSaved : whenSaved = defaultCallback;
      val = shortenItem(val({
        onlyTrim: true
      }));
      if (!val) {
        ig.notify("Please enter a value");
        return false;
      } else {
        item = {
          type: "item",
          value: val,
          created: timestamp()
        };
        return db.saveDoc(item, {
          success: function(data) {
            l("saved new item");
            return ig.doc(data.id, function(doc) {
              ig.notify("Created: " + doc);
              return whenSaved(doc);
            });
          },
          error: couchError("Could not create item '" + val + "'")
        });
      }
    };
    ig.deleteDoc = function(id, whenDeleted, forcingIt) {
      if (id == null) {
        throw "deleteDoc needs id";
      }
      whenDeleted != null ? whenDeleted : whenDeleted = defaultCallback;
      if (!forcingIt) {
        return ig.search("home/relations", {
          startkey: [id],
          endkey: [id, {}],
          limit: 1
        }, function(doc) {
          if (doc) {
            ig.notify("Delete dependent relations first: " + doc);
            return ig.doc(id, function(d) {
              return refreshDoc(d);
            });
          } else {
            return ig.doc(id, function(d) {
              return db.removeDoc(d, {
                success: function(data) {
                  ig.notify("Deleted: " + d);
                  return whenDeleted(d);
                },
                error: couchError("Could not delete " + d)
              });
            });
          }
        });
      } else {
        ;
      }
    };
    ig.editItem = function(id, newVal, whenEdited) {
      if (id == null) {
        throw "editItem needs id";
      }
      whenEdited != null ? whenEdited : whenEdited = defaultCallback;
      return ig.doc(id, function(doc) {
        var d;
        d = couchDoc(doc);
        d.value = newVal;
        d.updated = timestamp();
        l("saving item with new value '" + d.value + "'");
        return db.saveDoc(d, {
          success: function(data) {
            l("saved edited document, notifying app");
            return ig.doc(data.id, function(item) {
              ig.notify("Edited: " + item);
              return whenEdited(doc);
            });
          },
          error: couchError("Could not edit " + doc)
        });
      });
    };
    ig.selectDoc = function(id) {
      var makeRelation, select, unselect;
      if (id == null) {
        throw "selectDoc needs id";
      }
      select = function(doc) {
        selectedSpo.push(doc);
        doc.igSelectionIndex = selectedSpo.length;
        l("selected: " + doc);
        guiDocSelect(doc, doc.igSelectionIndex);
        if (selectedSpo.length === 3) {
          return makeRelation();
        }
      };
      unselect = function(doc) {
        selectedSpo.pop();
        doc.igSelectionIndex = 0;
        l("unselected: " + doc);
        return guiDocUnSelect(doc);
      };
      makeRelation = function() {
        var relation;
        l("subject, predicate and object selected, making relation");
        relation = {
          type: "relation",
          subject: selectedSpo[0]._id,
          predicate: selectedSpo[1]._id,
          object: selectedSpo[2]._id,
          created: timestamp()
        };
        return db.saveDoc(relation, {
          success: function(data) {
            var spo, _i, _len;
            for (_i = 0, _len = selectedSpo.length; _i < _len; _i++) {
              spo = selectedSpo[_i];
              spo.igSelectionIndex = 0;
              guiDocUnSelect(spo);
            }
            selectedSpo = [];
            return ig.doc(data.id, function(relation) {
              ig.notify("Created: " + relation);
              return ig.saveAnswers(relation, function() {
                return l("done saving answers");
              });
            });
          },
          error: couchError("Could not make relation")
        });
      };
      ig.doc(id, function(doc) {
        var spo, _ref;
        if (selectedSpo.length !== 0) {
          if (doc._id === selectedSpo[selectedSpo.length - 1]._id) {
            return unselect(doc);
          } else if (_ref = doc._id, __indexOf.call((function() {
            var _i, _len, _results;
            _results = [];
            for (_i = 0, _len = selectedSpo.length; _i < _len; _i++) {
              spo = selectedSpo[_i];
              _results.push(spo._id);
            }
            return _results;
          })(), _ref) >= 0) {
            return ig.notify("Sorry, already selected that one");
          } else if (selectedSpo.length === 3) {
            return ig.notify("Can't select more than 3");
          } else {
            return select(doc);
          }
        }
      });
      return ig;
    };
    ig.saveAnswers = function(relation, callback) {
      var answers, next;
      answers = ig.makeAnswers(relation);
      l("saving answers to db");
      next(0);
      return next = function(i) {
        return db.saveDoc(answers[i], {
          success: function(data) {
            l("saved: " + (JSON.stringify(answers[i].query)));
            if (i < answers.length - 1) {
              return next(i + 1);
            } else {
              return callback();
            }
          },
          error: couchError(JSON.stringify(answers[i].query))
        });
      };
    };
    return ig.makeAnswers = function(relation) {
      var prepare;
      return prepare = function(spo) {
        var obj;
        return obj = $.extend({}, spo);
      };
    };
  })(jQuery);
}).call(this);
