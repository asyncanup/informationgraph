(function($) {
  $.ig = $.ig || {};
  var ig = $.ig;

  var db;
  var debugMode = true; // whether debug mode is on
  var selectedSpo = [];
  var notifyUI = function(){};
  var cache = new LRUCache(1000);
  var hose; // to listen to document changes in the database
  var listeners = {};
  // listeners has jquery dom placeholders as keys and options objects as values
  // options have these fields:
  //    view - what view to query. passed as is to db.view
  //    template - what jquery template to use for data display
  //    and other options to pass on as is to db.view (like query parameters), success/error handlers
  // should not have a field called listener
  var defaultCallback = function(whatever){ 
    l("argument to defaultCallback: " + whatever); 
  }

  var refreshDoc = function(doc){
    // the default do-nothing refresh handler 
    // (called for every document in _changes)
    l("default refreshDoc called with " + doc);
  }

  var guiDocSelect = function(doc){
    // the default do-nothing gui selection handler for items
    l("default guiDocSelect called with " + doc);
  }

  var guiDocUnSelect = function(doc){
    // the default do-nothing gui unselection handler for items
    l("default guiDocUnSelect called with " + doc);
  }

  function setDefault(arg, v){
    return (typeof(arg) === "undefined") ? v : arg;
  }

  function l(val) { 
    if ( window.console && debugMode ) { console.log("ig: " + val); } 
    // if it is desired to log objects, they must first be JSON.stringify'ed
    // or be provided with a toString() method
  }
  
  function timestamp(){
    return (new Date()).getTime();
  }

  function couchDoc(doc){
    // takes a doc from cache and returns its couchdb json
    var d = $.extend({}, doc);
    delete d.toString;
    delete d.igSelectionIndex;
    // ISSUE: because of this, the docs in the db can't have toString and igSelectionIndex fields
    if (doc.type === "item"){
      return d;
    } else if (doc.type === "relation"){
      // ISSUE: relation docs can't these fields
      delete d.getSubject;
      delete d.getPredicate;
      delete d.getObject;
      return d;
    }
  }

  function require(arg, msg){
    if (typeof(arg) === "undefined"){
      if (msg){
        throw(msg);
      } else {
        throw("incomplete parameters");
      }
    }
  }

  function hashUp(spoIdArr){
    // accepts only a 3 member string array. 
    // replaces non-conforming members with null
    if (spoIdArr.length && spoIdArr.length === 3){
      return hex_sha1(JSON.stringify(spoIdArr.map(function (spoId){
        if(typeof(spoId === "string")){
          return spoId;
        } else {
          return null;
        }
      })));
    }
  }

  $.extend($.ig, {
    debug:            function(cmd){
                        // stops with "stop", starts with anything else
                        if (cmd){
                          debugMode = (cmd === "stop") ? false : true;
                          l("debug mode on");
                          return ig;
                        } else {
                          return debugMode;
                        }
                      },
    database:         function(dbname){ 
                        if (dbname) {
                          db = $.couch.db(dbname);
                          l("db set to " + dbname);
                          hose = db.changes();
                          hose.onChange(function(feed){
                            l("received _changes");
                            feed.results.forEach(function(d){
                              if (cache.find(d.id)){
                                if (d.deleted){
                                  cache.remove(d.id);
                                  l(d.id + " deleted");
                                  ig.refresh({ 
                                    "_id": d.id,  
                                    "_deleted": true,
                                    "toString": function(){ return this._id; }
                                  });
                                } else {
                                  ig.doc(d.id, function(doc){
                                    l(doc + " updated");
                                    ig.refresh(doc);
                                  }, true);
                                }
                              }
                            });
                          });
                          l("_changes feed set up");
                          return ig;
                        } else {
                          return db; 
                        }
                      },
    getListeners:     function(){ 
                        return listeners; 
                      },
    getCache:         function(){
                        return cache;
                      },
    doc:              function(id, callback, forceFetch){
                        require(id, "no id specified to ig.doc! unforgivable");
                        require(callback, "no callback to ig.doc, what a shame");
                        if (!forceFetch && cache.find(id)){
                          callback(cache.get(id));
                        } else {
                          db.openDoc(id, {
                            success: function(d){
                                         d.igSelectionIndex = 0;
                                         // whether this doc has been selected in gui
                                         if(d.type === "item"){
                                           d.toString = function(){ return this.value; }
                                           cache.remove(d._id);
                                           cache.put(d._id, d);
                                           l("item loaded: " + d);
                                           callback(d);
                                         } else if (d.type === "relation"){
                                           ig.doc(d.subject, function(subject){
                                             ig.doc(d.predicate, function(predicate){
                                               ig.doc(d.object, function(object){
                                                 d.getSubject = function(){
                                                     // note that this will return undefined
                                                     // if subject of a relation has been 
                                                     // changed without loading the new 
                                                     // subject doc in cache.
                                                     return cache.get(d.subject);
                                                 };
                                                 d.getPredicate = function(){
                                                     return cache.get(d.predicate);
                                                 };
                                                 d.getObject = function(){
                                                     return cache.get(d.object);
                                                 };
                                                 d.toString = function(){
                                                   return "( " + 
                                                            this.getSubject() + " - " + 
                                                            this.getPredicate() + " - " + 
                                                            this.getObject() + 
                                                          " )";
                                                 };
                                                 cache.remove(d._id);
                                                 cache.put(d._id, d);
                                                 l("relation loaded: " + d);
                                                 callback(d);
                                               });
                                             });
                                           });
                                         } else if (type === "answer"){
                                           l("answer loaded: " + d._id);
                                           callback(d);
                                         }
                                     }
                          });
                        }
                      },
    search:           function(view, query, callback, dontNotify){
                        // calls callback with false if no results
                        require(view, "search needs view");
                        require(callback, "search needs callback");
                        db.view(view, $.extend({}, query, {
                          success: function(data){ 
                                     if (!dontNotify) {
                                       ig.notify("Search results: " + data.rows.length);
                                     }
                                     if(data.rows.length === 0){
                                       callback(false);
                                     }
                                     data.rows.forEach(function(row){
                                       ig.doc(row.id, function(doc){
                                         callback(doc);
                                       });
                                     });
                                   }
                        }));
                      },
    notify:           function(text){
                        l(text);
                      },
    notification:     function(func){
                        require(func, "gui notification handler not specified");
                        ig.notify = function(text){
                          l(text);
                          func(text);
                        }
                        l("notification handler set up");
                        return ig;
                      },
    docSelection:     function(select, unselect){
                        require(select, "gui selection handler not specified");
                        require(unselect, "gui unselection handler not specified");
                        guiDocSelect = select;
                        guiDocUnSelect = unselect;
                        return ig;
                      },
    refresh:          function(arg){
                        // only details with refreshing the UI
                        // arg can be a function or placeholder or doc or nothing
                        function refreshPlaceholder(placeholder){
                          if (!listeners[placeholder]){
                            l("refresh: " + placeholder + " is not registered");
                            return false;
                          }
                          var options = listeners[placeholder];
                          var query = options.query;
                          var render = options.render;
                          var view = options.view;
                          l("refresh: refreshing " + placeholder);
                          if (options.beforeRender){
                            options.beforeRender();
                            l("refresh: " + placeholder + " initialized");
                          }
                          ig.search(view, query, function(doc){
                            if(doc) {
                              render(doc);
                              (doc.igSelectionIndex)?  
                                  guiDocSelect(doc, doc.igSelectionIndex) : 
                                  guiDocUnSelect(doc);
                              l("refresh: rendered " + doc);
                            } else {
                              l("refresh: no results in " + view + " query");
                            }
                          });
                        }

                        if (typeof(arg) === "function"){
                          // refreshDoc handler
                          refreshDoc = arg;
                          l("refreshDoc set");
                        } else if (typeof(arg) === "string"){
                          // placeholder
                          l("refresh: " + arg);
                          $.each([arg], function(i, p){
                            refreshPlaceholder(p);
                          });
                        } else if (typeof(arg) === "object"){
                          // doc
                          l("refreshDoc(" + arg + ")");
                          refreshDoc(arg);
                          (arg.igSelectionIndex)?  
                              guiDocSelect(arg, arg.igSelectionIndex) : 
                              guiDocUnSelect(arg);
                        } else if (typeof(arg) === "undefined"){
                          // refresh the whole page
                          l("refresh: everything");
                          $.each(listeners, function(p, v){
                            refreshPlaceholder(p);
                          });
                        }
                        return ig;
                      },
    linkPlaceholder:  function(placeholder, options){
                        require(placeholder, "linkPlaceholder needs placeholder");
                        require(options, "linkPlaceholder needs options parameter");
                        require(options.render, "linkPlaceholder needs options.render");
                        require(options.view, "linkPlaceholder needs options.view");

                        listeners[placeholder] = options;
                        l("linked " + placeholder + " to " + options.view);
                        ig.refresh(placeholder);
                        return ig;
                      },
    unlinkPlaceholder:function(placeholder){
                        delete listeners[placeholder];
                        ig.refresh(); // NOTE: contentious
                        return ig;
                      },
    unlinkAll:        function(){ 
                        listeners = {}; 
                        l("cleared all placeholder listeners!"); 
                        return ig;
                      },
    newItem:          function(val, whenSaved){
                        whenSaved = setDefault(whenSaved, defaultCallback);
                        val = shortenItem(val, { "onlyTrim": true });
                        if (!val){ throw("empty value"); }
                        db.saveDoc({
                          "type":   "item",
                          // trim, remove repeated whitespace in value string
                          // this is a contentious issue, if this should be done or not
                          "value":  val,
                          "created_at": timestamp()
                        }, {
                          success:  function(data){
                                      l("saved new item");
                                      ig.doc(data.id, function(doc){
                                        ig.notify("Created: " + doc);
                                        whenSaved(doc);
                                      });
                                    }
                        });
                      },
    deleteDoc:        function(id, whenDeleted, forcingIt){
                        whenDeleted = setDefault(whenDeleted, defaultCallback);
                        require(id, "deleteDoc needs id");
                        if(!forcingIt){
                          ig.search("home/relations", {
                            startkey:   [id],
                            endkey:     [id, {}],
                            limit:      1
                          }, function(doc){
                            if (doc){
                              ig.notify("Delete dependent relations first: " + doc);
                              ig.doc(id, function(d){
                                refreshDoc(d);
                              });
                            } else {
                              // search query returned no results
                              ig.doc(id, function(d){
                                db.removeDoc(d, {
                                  success: function(data){
                                             l("deleted " + d);
                                             ig.notify("Deleted: " + d);
                                             whenDeleted(d);
                                           }
                                });
                              });
                            }
                          });
                        }
                      },
    editItem:         function(id, newVal, whenEdited){
                        whenEdited = setDefault(whenEdited, defaultCallback);
                            // how about ifNot(whenEdited).then(defaultCallback)
                        require(id, "editItem needs id");
                        ig.doc(id, function(doc){
                          var d = couchDoc(doc);
                          d.value = newVal;
                          d.updated_at = timestamp();
                          l("saving item with new value '" + d.value + "'");
                          db.saveDoc(d, {
                            success:  function(data){
                                        l("saved edited document, notifying app");
                                        ig.doc(data.id, function(item){
                                          ig.notify("Edited: " + item);
                                          whenEdited(doc);
                                        });
                                      }
                          });
                        });
                      },
    selectDoc:        function(id){
                        require(id, "selectDoc needs id");
                        function select(doc){
                          selectedSpo.push(doc);
                          doc.igSelectionIndex = selectedSpo.length;
                          l("selected: " + doc);
                          guiDocSelect(doc, doc.igSelectionIndex);

                          if (selectedSpo.length == 3){
                            makeRelation();
                          }
                        }
                        function unselect(doc){
                          selectedSpo.pop();
                          doc.igSelectionIndex = 0;
                          l("unselected:" + doc);
                          guiDocUnSelect(doc);
                        }
                        function makeRelation(){
                          l("subject, predicate and object selected, making relation");
                          db.saveDoc({
                            "_id":        hashUp(selectedSpo.map(function(spo){ return spo._id; })),
                            "type":       "relation",
                            "subject":    selectedSpo[0]._id,
                            "predicate":  selectedSpo[1]._id,
                            "object":     selectedSpo[2]._id,
                            "created_at": timestamp()
                          }, {
                            success: function(data){
                                       $.each(selectedSpo, function(i, item){
                                         item.igSelectionIndex = 0;
                                         guiDocUnSelect(item);
                                       });
                                       selectedSpo = [];
                                       ig.doc(data.id, function(relation){
                                         ig.notify("Created: " + relation);
                                         var allAns = [];
                                         // TODO: makeAnswers
                                       });
                                     }
                          });
                        }


                        ig.doc(id, function(doc){
                          if (selectedSpo.length !== 0){
                            if (doc._id === selectedSpo[selectedSpo.length - 1]._id){
                              unselect(doc);
                            } else if (
                              $.inArray(
                                doc._id, 
                                selectedSpo.map(function(spo){
                                  return spo._id;
                                })
                              ) !== -1) {
                              ig.notify("Sorry, already selected that one.");
                            } else {
                              select(doc);
                            }
                          } else {
                            select(doc);
                          }
                        });
                        return ig;
                      },
    makeAnswers:      function(relation){
                        function prepare(spo){
                          if (!spo) { cl("STOP RIGHT NOW!"); }
                          var obj = $.extend({}, spo);
                          obj.currentIndex = obj.nullIndex = -1;
                          obj.isNull = false;
                          if (obj.type === "relation"){
                            obj[0] = prepare(obj.getSubject());
                            obj[1] = prepare(obj.getPredicate());
                            obj[2] = prepare(obj.getObject());
                            obj[0].up = obj[1].up = obj[2].up = obj;
                          }
                          return obj;
                        }
                        function newAnswer(qid, spo){
                          return {
                            "query":    qid,
                            "type":     "answer",
                            "relation": relation.toString(),
                            "answer":   spo.toString()
                          }
                        }
                        function queryId(r){
                          //cl("queryId for " + JSON.stringify(r));
                          var ids = [];
                          if (r.isNull === true){
                            cl("null");
                            ids.push(null);
                          } else if (r.type && r.type === "item"){
                            cl(r.toString());
                            ids.push(r._id);
                          } else if (r.type && r.type === "relation"){
                            cl(r.toString());
                            ids.push(hashUp([0,1,2].map(function(n){
                              return queryId(r[n]);
                            })));
                          } else {
                            cl("SCREAM OUT LOUD");
                          }
                          return hashUp(ids);
                        }
                        function shiftNull(r){
                          if (r === false){
                            // meaning shiftNull was called on R.up (boundary condition)
                            return;
                          }
                          r.currentIndex = 0;
                          if (r.nullIndex === -1){
                            r.nullIndex = 0;
                            r[0].isNull = true;
                            triggerAnswer();
                            more(r);
                          } else if (r.nullIndex < 2){
                            r[r.nullIndex].isNull = false;
                            r.nullIndex += 1;
                            r[r.nullIndex].isNull = true;
                            triggerAnswer();
                            more(r);
                          } else if (r.nullIndex === 2){
                            r[r.nullIndex] = false;
                            r.nullIndex = -1;
                            shiftNull(r.up);
                          }
                        }
                        function triggerAnswer(){
                          answers.push(newAnswer(queryId(R), R[R.nullIndex]));
                        }
                        function more(r){
                          if (r.nullIndex === -1){
                            shiftNull(r);
                          } else if (r.currentIndex === r.nullIndex){
                            r.currentIndex += 1;
                            more(r);
                          } else if (r.currentIndex === 3){
                            shiftNull(r);
                          } else if (r[r.currentIndex].type === "item"){
                            r.currentIndex += 1;
                            more(r)
                          } else if (r[r.currentIndex].type === "relation"){
                            more(r[0]);
                          } else {
                            cl("NO BLOODY WAY");
                          }
                        }

                        var answers = [];
                        var R = prepare(relation);
                        R.up = false;
                        more(R);
                        return answers;
                      },
    setupLogin:       function(loginOptions, loggedIn, loggedOut){
                        // ISSUE: Ok with loggedIn/loggedOut having to return dom 
                        // element to put click handler on?
                        loginOptions = loginOptions || {};
                        var loginData = loginOptions.loginData || 
                                        {"name": "_", "password": "_"};

                        require(loggedIn, "setupLogin needs login handler");
                        require(loggedOut, "setupLogin needs logout handler");
                        var login = function(){
                          l("Logging in");
                          $.couch.login($.extend(loginData, {success: loggedIn}));
                        };
                        var logout = function(){
                          l("Logging out");
                          $.couch.logout({success: loggedOut});
                        };

                        var loginElem; // on clicking which you login/logout
                        $.couch.session({
                          success: function(res){
                                     if (res.userCtx.roles.length === 0){
                                       l("userCtx.roles is empty");
                                       loginElem = loggedOut();
                                       loginElem.toggle(login, logout);
                                     } else {
                                       l("userCtx.roles is non-empty");
                                       loginElem = loggedIn();
                                       loginElem.toggle(logout,login);  
                                     }
                                   }
                        });
                        return ig;
                      },
    emptyDb:          function(){
                        db.allDocs({
                          include_docs: true,
                          success:      function(data){
                                          $.each(data.rows, function(i, row){
                                            db.removeDoc(row.doc);
                                          });
                                        }
                        });
                      }
  });
})(jQuery);
