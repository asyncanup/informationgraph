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
  function l(val) { 
    if ( window.console && debugMode ) { console.log("ig: " + val); } 
    // if it is desired to log objects, they must first be JSON.stringify'ed
  }
  function timestamp(){
    return (new Date()).getTime();
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
                            feed.results.forEach(function(d){
                              if (cache.find(d.id)){
                                if (d.deleted){
                                  cache.remove(d.id);
                                  l(d.id + " deleted");
                                  ig.refresh({ "_id": d.id,  "_deleted": true });
                                } else {
                                  ig.doc(d.id, function(doc){
                                    l(doc._id + " updated");
                                    ig.refresh(doc);
                                  }, true);
                                  ig.refresh(doc);
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
    doc:              function(id, callback, forceFetch){
                        if (!forceFetch && cache.find(id)){
                          callback(cache.get(id));
                        } else {
                          db.openDoc(id, {
                            success: function(doc){
                                       cache.remove(id);
                                       cache.put(id, doc);
                                       callback(doc);
                                     }
                          });
                        }
                      },
    search:           function(view, query, callback){
                        if (!view || !callback){
                          throw("incomplete options parameter to search");
                        }
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
                        var refreshDoc = function(doc){
                          // the default do-nothing refresh handler 
                          // (called for every document in _changes)
                          l(JSON.stringify(doc));
                        }
                        if (arg){
                          if (typeof arg === "function"){
                            refreshDoc = arg;
                            l("refresh handler set");
                          } else {
                            // doc
                            refreshDoc(arg);
                            l("refreshing " + arg._id);
                          }
                        } else {
                          // no argument passed
                          for (var placeholder in listeners){
                            var options = listeners[placeholder];
                            var query = options.query;
                            var render = options.render;
                            var view = options.view;
                            l("refreshing " + placeholder);
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
                        if (!placeholder || 
                            !options ||
                            !options.render ||
                            !options.view){
                          throw("incomplete parameters to linkPlaceholder");
                        }
                        l("linking " + placeholder + " to " + options.view);
                        listeners[placeholder] = options;
                        return ig;
                      },
    unlinkPlaceholder:function(placeholder){
                        delete listeners[placeholder];
                        return ig;
                      },
    unlinkAll:        function(){ 
                        l("cleared all placeholder listeners!"); 
                        listeners = {}; 
                        return ig;
                      },
    newItem:          function(val){
                        val = shortenItem(val, { "onlyTrim": true });
                        var isSaved = false;
                        db.saveDoc({
                          "type":   "item",
                          // trim, remove repeated whitespace in value string
                          // this is a contentious issue, if this should be done or not
                          "value":  val,
                          "created_at": timestamp()
                        }, {
                          success:  function(data){
                                      isSaved = true;
                                      l("saved new item");
                                      ig.notify({
                                        "action": "Created",
                                        "data": val
                                      });
                                    }
                        });
                        return isSaved;
                      },
    deleteItem:       function(doc, options){
                        options = options || {};
                        l("deleting item '" + doc.value + "'");
                        db.removeDoc(
                            doc,
                            $.extend({ 
                              success: function(data){
                                         l("deleted item");
                                         ig.notify({
                                           "action": "Deleted",
                                           "data": doc.value
                                         });
                                       }
                            }, options)
                        );
                      },
    editItem:         function(doc, options){
                        options = options || {};

                        doc.updated_at = timestamp();
                        l("saving item with new value '" + doc.value + "'");
                        db.saveDoc(doc, 
                            $.extend({
                              success:  function(data){
                                          l("saved edited document, notifying app");
                                          // now refresh the relevant view results
                                          ig.notify({
                                            "action": "Edited",
                                            "data": doc.value
                                          });
                                        }
                            }, options) );
                      },
    selectItem:       function(doc, toggleGui){
                        // NOTE: that there is no options parameter here even though a 
                        // db.saveDoc query is being made in the function
                        function select(){
                          l("selecting item '" + doc.value + "'");
                          selectedItems.push(doc);
                          toggleGui(selectedItems.length);
                        }
                        function unselect(){
                          l("unselecting '" + doc.value + "'");
                          selectedItems.pop();
                          toggleGui(selectedItems.length);
                        }
                        if (doc._id && selectedItems.length !== 0){
                          if (doc._id === selectedItems[selectedItems.length - 1]._id){
                            // note: checking only for _id. good with it?
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
                          }, $.extend({
                            success: function(d){
                                       l("relation saved");
                                       var relationText = selectedItems
                                                            .map(function(item){ 
                                                              return item.value; 
                                                            }).join(" - ");
                                       selectedItems = [];
                                       ig.notify({
                                         "action": "Created",
                                         "data": relationText
                                       });
                                     }
                          }, {})); // because there are no options parameters
                        }
                      },
    // This leaves the gui for selected items as it is. Not cool.
    //clearSelectedItems: function(){
                          //l("clearing item selection for new relation");

                          //selectedItems = [];
                        //},
    setupLogin:       function(loginOptions, loggedIn, loggedOut){
                        // ISSUE: Ok with loggedIn/loggedOut having to return dom 
                        // element to put click handlers on?
                        loginOptions = loginOptions || {};
                        var loginData = loginOptions.loginData || 
                                        {"name": "_", "password": "_"};

                        if (!loggedIn || !loggedOut){
                          throw("missing login/logout success handler");
                        }
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
