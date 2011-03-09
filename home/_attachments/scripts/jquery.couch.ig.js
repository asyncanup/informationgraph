(function($) {
  $.ig = $.ig || {};

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
                          return this;
                        } else {
                          return debugMode;
                        }
                      },
    database:         function(dbname){ 
                        var that = this;
                        if (dbname) {
                          db = $.couch.db(dbname);
                          l("db set to " + dbname);
                          hose = db.changes();
                          hose.onChange(function(feed){
                            feed.results.forEach(function(d){
                              if (d.deleted){
                                cache.remove(d.id);
                                l(d.id + " deleted");
                                return;
                              }
                              that.doc(d.id, function(doc){
                                l(doc._id + " updated");
                              }, true);
                            });
                          });
                          l("hose set up");
                          return that;
                        } else {
                          return db; 
                        }
                      },
    doc:              function(id, callback, forceFetch){
                        if (cache.find(id) && !forceFetch){
                          callback(cache.get(id));
                        } else {
                          db.openDoc(id, {
                            success: function(doc){
                                       cache.set(id, doc);
                                       callback(doc);
                                     }
                          });
                        }
                      },
    render:           function(doc, options){
                        l("rendering '" + doc.value + "' in " + options.placeholder);
                        if (!options || !options.template || !options.placeholder) {
                          throw("incomplete options to render"); 
                        }
                        $(options.template).tmpl(doc).appendTo(options.placeholder);
                      },
    search:           function(options, callback){
                        var that = this;
                        if (!options || !options.view || !options.type){
                          throw("incomplete options parameter to search");
                        }
                        var viewOpts = $.extend({}, options);
                        var view = viewOpts.view;
                        var type = viewOpts.type;
                        delete viewOpts.view;
                        delete viewOpts.type;
                        viewOpts.include_docs = false; 
                        // NOTE: setting include_docs=true, hence, has no effect
                        db.view(view, $.extend(viewOpts, {
                          success: function(data){ 
                                     l("search query returned successfully with " + 
                                         data.rows.length + " items");
                                     data.rows.forEach(function(row){
                                       that.doc(row.id, function(doc){
                                         callback(doc);
                                       });
                                     });
                                   }
                        }));
                      },
    notification:     function(func){
                        notifyUI = func;
                        return this;
                      },
    notify:           function(content){
                        // at every trigger of this function,
                        // all registered view query listeners will be fired and refreshed
                        var that = this;
                        if (content){
                          l("triggering GUI notification");
                          var text =  content.action.toString() +
                                      ": '" +
                                      content.data.toString() +
                                      "'";
                          // use of toString() is contentious, think about it. remove?
                          l(text);
                          notifyUI(text);
                          if ($.inArray(content.action, 
                                ["Created", "Deleted", "Edited"]) !== -1){
                            that.refreshViewResults();
                          }
                        }
                      },
    refreshViewResults: function(){
                          var that = this;
                          // TODO: make this the function that gets called every few secs
                          // it will ask for revision values of all registered items, ie, 
                          // those cached by this app except for the ones belonging to 
                          // placeholders with setListener set to false. Then get the full docs 
                          // for those items that require refreshing and cache them.
                          l("refreshing view results");

                          selectedItems = [];
                          for (var placeholder in listeners){
                            if (listeners[placeholder].setListener){
                              // don't touch the placeholders that have been unregistered
                              var options = $.extend(
                                  { "placeholder": placeholder },
                                  listeners[placeholder]
                                  );
                              that.showViewResults(options);
                            }
                          }
                        },
    getListeners:     function(){ 
                        return listeners; 
                      },
    clearListeners:   function(){ 
                        l("cleared all listeners!"); listeners = {}; 
                      },
    newItem:          function(val){
                        var that = this;
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
                                      that.notify({
                                        "action": "Created",
                                        "data": val
                                      });
                                    }
                        });
                        return isSaved;
                      },
    showViewResults:  function(options){
                        // TODO: do not query db, just use values from cache
                        var that = this;
                        if (!options || !options.template || !options.placeholder){
                          throw("incomplete options parameter to showViewResults");
                        }
                        l("showing view results"); 
                        options = options || {};
                        var placeholder = options.placeholder;
                        var template = options.template;
                        if (options.empty) {
                          $(placeholder).empty();
                        }
                        delete options.placeholder;

                        if (typeof options.setListener !== 'undefined'){
                          // a setListener directive has to be sent to register or 
                          // unregister the placeholder from listeners
                          // previously set listeners will be changed as per options received
                          l("setting up listener for " + placeholder); 
                          if (listeners[placeholder]){
                            // options from earlier are preserved
                            $.extend(listeners[placeholder], options);
                          } else {
                            listeners[placeholder] = options;
                          }
                        }
                        var searchOpts = $.extend({}, options);
                        delete searchOpts.template;
                        delete searchOpts.setListener;
                        that.search(searchOpts, function(doc){
                          that.render(doc, {
                            "template":   template,
                            "placeholder":   placeholder
                          });
                        });
                        return this;
                      },
    deleteItem:       function(doc, options){
                        var that = this;
                        options = options || {};
                        l("deleting item '" + doc.value + "'");
                        db.removeDoc(
                            doc,
                            $.extend({ 
                              success: function(data){
                                         l("deleted item");
                                         that.notify({
                                           "action": "Deleted",
                                           "data": doc.value
                                         });
                                       }
                            }, options)
                        );
                      },
    editItem:         function(doc, options){
                        var that = this;
                        options = options || {};

                        doc.updated_at = timestamp();
                        l("saving item with new value '" + doc.value + "'");
                        db.saveDoc(doc, 
                            $.extend({
                              success:  function(data){
                                          l("saved edited document, notifying app");
                                          // now refresh the relevant view results
                                          that.notify({
                                            "action": "Edited",
                                            "data": doc.value
                                          });
                                        }
                            }, options) );
                      },
    selectItem:       function(doc, toggleGui){
                        // NOTE: that there is no options parameter here even though a 
                        // db.saveDoc query is being made in the function
                        var that = this;
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
                            return that;
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
                                       that.notify({
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
                        return this;
                      }
  });
})(jQuery);
