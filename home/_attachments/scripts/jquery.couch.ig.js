(function($) {
  $.ig = $.ig || {};
  var ig = $.ig;

  var db;
  var debugMode = true; // whether debug mode is on
  var selectedItems = [];
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
  function setDefault(arg, v){
    return (typeof(arg) === "undefined") ? v : arg;
  }
  function l(val) { 
    if ( window.console && debugMode ) { console.log("ig: " + val); } 
    // if it is desired to log objects, they must first be JSON.stringify'ed
  }
  function timestamp(){
    return (new Date()).getTime();
  }
  function couchDoc(doc){
    // takes a doc from cache and returns its couchdb json
    var d = $.extend({}, doc);
    delete d.toString;
    if (doc.type === "item"){
      return d;
    } else if (doc.type === "relation"){
      d.subject = d.subject._id;
      d.predicate = d.predicate._id;
      d.object = d.object._id;
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
                                  ig.refresh({ "_id": d.id,  "_deleted": true });
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
                          l("loading item from db");
                          db.openDoc(id, {
                            success: function(d){
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
                                                 d.subject = subject;
                                                 d.predicate = predicate;
                                                 d.object = object;
                                                 d.toString = function(){
                                                   return "( " + 
                                                            this.subject + " - " + 
                                                            this.predicate + " - " + 
                                                            this.object + 
                                                          " )";
                                                 };
                                                 cache.remove(d._id);
                                                 cache.put(d._id, d);
                                                 l("relation loaded: " + d);
                                                 callback(d);
                                               });
                                             });
                                           });
                                         }
                                     }
                          });
                        }
                      },
    search:           function(view, query, callback){
                        require(view, "search needs view");
                        require(callback, "search needs callback");
                        db.view(view, $.extend({}, query, {
                          success: function(data){ 
                                     l("search query returned successfully with " + 
                                         data.rows.length + " rows");
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
    refresh:          function(arg){
                        // only details with refreshing the UI
                        // arg can be a function or doc or nothing
                        if (arg){
                          if (typeof(arg) === "function"){
                            refreshDoc = arg;
                            l("refreshDoc set");
                          } else {
                            // doc
                            l("refreshDoc(" + arg + ")");
                            refreshDoc(arg);
                          }
                        } else {
                          // no argument passed
                          for (var placeholder in listeners){
                            var options = listeners[placeholder];
                            var query = options.query;
                            var render = options.render;
                            var view = options.view;
                            l("refreshing placeholder: " + placeholder);
                            if (options.beforeRender){
                              options.beforeRender();
                            }
                            ig.search(view, query, function(doc){
                              render(doc);
                            });
                          }
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
                        return ig;
                      },
    unlinkPlaceholder:function(placeholder){
                        delete listeners[placeholder];
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
    deleteDoc:        function(id, whenDeleted){
                        whenDeleted = setDefault(whenDeleted, defaultCallback);
                        require(id, "deleteDoc needs id");
                        ig.doc(id, function(doc){
                          var d = couchDoc(doc);
                          l("deleting doc");
                          db.removeDoc(d, { 
                            success: function(data){
                                       l("deleted item");
                                       ig.doc(data.id, function(doc){
                                         ig.notify("Deleted: " + doc);
                                         whenDeleted(doc);
                                       });
                                     }
                          });
                        });
                      },
    editItem:         function(id, newVal, whenSaved){
                        whenSaved = setDefault(whenSaved, defaultCallback);
                        require(id, "editItem needs id");
                        ig.doc(id, function(doc){
                          var d = couchDoc(doc);
                          d.value = newVal;
                          d.updated_at = timestamp();
                          l("saving item with new value '" + doc.value + "'");
                          db.saveDoc(d, {
                            success:  function(data){
                                        l("saved edited document, notifying app");
                                        ig.doc(data.id, function(doc){
                                          ig.notify("Edited: " + doc);
                                          whenSaved(doc);
                                        });
                                      }
                          });
                        });
                      },
    selectDoc:        function(id, toggleGui){
                        require(id, "selectDoc needs id");
                        require(toggleGui, "selectDoc needs toggleGui");
                        ig.doc(id, function(doc){
                          function select(){
                            l("selecting: " + doc);
                            selectedItems.push(doc);
                            toggleGui(selectedItems.length);
                          }
                          function unselect(){
                            l("unselecting:" + doc);
                            selectedItems.pop();
                            toggleGui(selectedItems.length);
                          }
                          if (doc._id && selectedItems.length !== 0){
                            if (doc._id === selectedItems[selectedItems.length - 1]._id){
                              unselect();
                              return ig;
                            } else {
                              // checking if the received item is not already selected
                              // (except for the case when it was the last seleted item,
                              // which has been handled above)
                              selectedItems.forEach(function(item){
                                if (item._id === doc._id){
                                  throw("item already selected");
                                }
                              });
                            }
                          }
                          select();
                          if (selectedItems.length >= 3){
                            l("subject, predicate and object selected, making relation");
                            db.saveDoc({
                              "type":       "relation",
                              "subject":    selectedItems[0]._id,
                              "predicate":  selectedItems[1]._id,
                              "object":     selectedItems[2]._id,
                              "created_at": timestamp()
                            }, {
                              success: function(data){
                                         selectedItems = [];
                                         ig.doc(data.id, function(doc){
                                           ig.notify("Created: " + doc);
                                         });
                                       }
                            });
                          }
                        });
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
                      }
  });
})(jQuery);
