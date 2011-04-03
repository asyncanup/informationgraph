var __indexOf = Array.prototype.indexOf || function(item) {
  for (var i = 0, l = this.length; i < l; i++) {
    if (this[i] === item) return i;
  }
  return -1;
};
(function(jQuery) {
  var $, cache, couchError, db, debugMode, defaultCallback, guiDocSelect, guiDocUnSelect, handleGuiSelection, hose, ig, l, listeners, notifyUI, prepare, refreshDoc, selectedSpo, selectionIndex, timestamp, _ref;
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
  selectionIndex = {};
  handleGuiSelection = function(doc) {
    if (doc == null) {
      throw "handleGuiSelection needs doc";
    }
    if (selectionIndex[doc._id]) {
      guiDocSelect(doc, selectionIndex[doc._id]);
    } else {
      guiDocUnSelect(doc);
    }
    if (doc.type === "relation") {
      handleGuiSelection(doc.getSubject());
      handleGuiSelection(doc.getPredicate());
      return handleGuiSelection(doc.getObject());
    }
  };
  guiDocSelect = function(doc) {
    return l("default guiDocSelect: " + doc);
  };
  guiDocUnSelect = function(doc) {
    return l("default guiDocUnSelect: " + doc);
  };
  l = function(str) {
    if (window.console && debugMode) {
      return window.console.log("ig: " + str);
    }
  };
  timestamp = function() {
    return (new Date()).getTime();
  };
  prepare = function(doc) {
    /* Makes a doc returned by db.openDoc apt for ig's consumption
        (putting into cache, letting it be selected, etc)
    */    var setupSpo;
    selectionIndex[doc._id] = 0;
    setupSpo = function(spo) {
      switch (spo.type) {
        case "item":
          return spo.toString = function() {
            return this.value;
          };
        case "relation":
          spo.getSubject = function() {
            return doc.docs[this.subject];
          };
          spo.getPredicate = function() {
            return doc.docs[this.predicate];
          };
          spo.getObject = function() {
            return doc.docs[this.object];
          };
          return spo.toString = function() {
            return "( " + (this.getSubject()) + " - " + (this.getPredicate()) + " - " + (this.getObject()) + " )";
          };
      }
    };
    setupSpo(doc);
    if (doc.type === "relation") {
      $.each(doc.docs, function(id, d) {
        return setupSpo(d);
      });
    }
    return doc;
  };
  couchError = function(err) {
    return function(response, id, reason) {
      return ig.notify("" + err + ": " + reason);
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
        var d, doc, _i, _len, _ref, _results;
        l("received changes");
        _ref = feed.results;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          d = _ref[_i];
          _results.push((function() {
            if (cache.find(d.id)) {
              if (d.deleted) {
                /* the deleted property is what couchdb
                    sets in feed results. not mine */
                doc = cache.get(d.id);
                l("" + doc + " deleted");
                doc._deleted = true;
                ig.refresh(doc);
                return cache.remove(doc.id);
              } else {
                return ig.doc(d.id, function(doc) {
                  l("" + doc + " updated");
                  return ig.refresh(doc);
                }, true);
              }
            }
          })());
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
          var _ref;
          if ((_ref = d.type) === "item" || _ref === "relation") {
            prepare(d);
            cache.remove(d._id);
            cache.put(d._id, d);
            l("" + d.type + " fetched: " + d);
            return callback(d);
          }
        },
        error: couchError("could not open document: " + id)
      });
    }
  };
  ig.search = function(view, query, resultDocCallback, noResultsCallback, dontNotify) {
    if (view == null) {
      throw "search needs view";
    }
    if (noResultsCallback == null) {
      throw "search needs resultDocCallback";
    }
    query != null ? query : query = {};
    return db.view(view, $.extend(query, {
      success: function(data) {
        var row, _i, _len, _ref, _results;
        if (!dontNotify) {
          ig.notify("Search results: " + data.rows.length);
        }
        if (data.rows.length === 0) {
          return typeof noResultsCallback == "function" ? noResultsCallback() : void 0;
        } else {
          _ref = data.rows;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            row = _ref[_i];
            _results.push(ig.doc(row.id, function(doc) {
              return resultDocCallback(doc);
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
      l("notify: " + text);
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
      var options;
      if (listeners[placeholder] == null) {
        l("refresh: " + placeholder + " is not registered");
        return false;
      } else {
        options = listeners[placeholder];
        l("refresh: refreshing " + placeholder);
        if (typeof options.beforeRender == "function") {
          options.beforeRender();
        }
        return ig.search(options.view, options.query, function(doc) {
          options.render(doc);
          handleGuiSelection(doc);
          return l("refresh: rendered " + doc);
        }, function() {
          return l("refresh: no results for the " + options.view + " query in " + placeholder);
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
      case "object":
        if ((arg.length != null) && (arg.push != null)) {
          for (_i = 0, _len = arg.length; _i < _len; _i++) {
            p = arg[_i];
            refreshPlaceholder(p);
          }
        } else if (arg._deleted || (arg.type != null)) {
          l("refreshDoc: " + arg);
          refreshDoc(arg);
          handleGuiSelection(arg);
          if (arg._deleted) {
            ig.notify("" + arg + " got deleted");
          }
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
    val = shortenItem(val, {
      onlyTrim: true
    });
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
    var removeNow;
    if (id == null) {
      throw "deleteDoc needs id";
    }
    whenDeleted != null ? whenDeleted : whenDeleted = defaultCallback;
    removeNow = function(id) {
      return ig.doc(id, function(doc) {
        return db.removeDoc(doc, {
          success: function(data) {
            ig.notify("Deleted: " + doc);
            return whenDeleted(doc);
          },
          error: couchError("Could not delete " + doc)
        });
      });
    };
    if (forcingIt) {
      return removeNow(id);
    } else {
      return ig.search("home/relations", {
        startkey: [id],
        endkey: [id, {}],
        limit: 1
      }, function(doc) {
        ig.notify("Delete dependent relations first: " + doc);
        return ig.doc(id, function(d) {
          return refreshDoc(d);
        });
      }, function() {
        return removeNow(id);
      });
    }
  };
  ig.editItem = function(id, newVal) {
    if (id == null) {
      throw "editItem needs id";
    }
    typeof whenEdited != "undefined" && whenEdited !== null ? whenEdited : whenEdited = defaultCallback;
    return ig.doc(id, function(doc) {
      var d;
      d = $.extend({}, doc);
      d.value = newVal;
      d.updated = timestamp();
      l("saving item with new value '" + d.value + "'");
      return db.saveDoc(d, {
        success: function(data) {
          l("saved edited document, notifying app");
          return ig.notify("Edited: " + doc);
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
      selectionIndex[doc._id] = selectedSpo.length;
      l("selected: " + doc);
      guiDocSelect(doc, selectionIndex[doc._id]);
      if (selectedSpo.length === 3) {
        return makeRelation();
      }
    };
    unselect = function(doc) {
      selectedSpo.pop();
      selectionIndex[doc._id] = 0;
      l("unselected: " + doc);
      return guiDocUnSelect(doc);
    };
    makeRelation = function() {
      var o, p, relation, s, spo, x, _i, _len, _ref;
      l("subject, predicate and object selected, making relation");
      spo = (_ref = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = selectedSpo.length; _i < _len; _i++) {
          x = selectedSpo[_i];
          _results.push($.extend({}, x));
        }
        return _results;
      })(), s = _ref[0], p = _ref[1], o = _ref[2], _ref);
      relation = {
        type: "relation",
        subject: s._id,
        predicate: p._id,
        object: o._id,
        docs: {},
        created: timestamp()
      };
      for (_i = 0, _len = spo.length; _i < _len; _i++) {
        x = spo[_i];
        if (x.type === "relation") {
          $.extend(relation.docs, x.docs);
        }
        delete x.docs;
        relation.docs[x._id] = x;
      }
      cl(relation.docs);
      window.ss = selectedSpo;
      window.r = relation;
      return db.saveDoc(relation, {
        success: function(data) {
          var spo, _i, _len;
          for (_i = 0, _len = selectedSpo.length; _i < _len; _i++) {
            spo = selectedSpo[_i];
            selectionIndex[spo._id] = 0;
            guiDocUnSelect(spo);
          }
          selectedSpo = [];
          return ig.doc(data.id, function(relation) {
            return ig.notify("Created: " + relation);
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
      } else {
        return select(doc);
      }
    });
    return ig;
  };
  ig.setupLogin = function(loginOptions, loggedIn, loggedOut) {
    var login, loginElem, logout;
    if (loggedIn == null) {
      throw "setupLogin needs login handler";
    }
    if (loggedOut == null) {
      throw "setupLogin needs logout handler";
    }
    loginOptions != null ? loginOptions : loginOptions = {};
    typeof loginData != "undefined" && loginData !== null ? loginData : loginData = {
      name: "_",
      password: "_"
    };
    login = function() {
      l("Logging in");
      return $.couch.login($.extend(loginData, {
        success: loggedIn,
        error: couchError("Could not login")
      }));
    };
    logout = function() {
      l("Logging out");
      return $.couch.logout({
        success: loggedOut,
        error: couchError("Could not logout")
      });
    };
    loginElem = null;
    $.couch.session({
      success: function(response) {
        if (response.userCtx.roles.length === 0) {
          l("useCtx.roles is empty");
          loginElem = loggedOut();
          return loginElem.toggle(login, logout);
        } else {
          l("userCtx.roles is non-empty");
          loginElem = loggedIn();
          return loginElem.toggle(logout, login);
        }
      },
      error: couchError("Could not connect to database")
    });
    return ig;
  };
  return ig.emptyDb = function() {
    return db.allDocs({
      include_docs: true,
      success: function(data) {
        var row, _i, _len, _ref, _results;
        _ref = data.rows;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          row = _ref[_i];
          _results.push(row.id.substr(0, 8) !== "_design/" ? db.removeDoc(row.doc) : void 0);
        }
        return _results;
      },
      error: couchError("Could not empty the database")
    });
  };
})(jQuery);