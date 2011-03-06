(function($) {
  $.ig = $.ig || {};

  var db;
  var debugMode = true; // whether debug mode is on
  var selectedItems = [];
  var listeners = {};
  var notifyUI = function(){};
  // listenes has jquery dom selectors as keys and options hashes as values
  // options have these fields:
  //    view - what view to query. passed as is to db.view
  //    template - what jquery template to use for data display
  //    and other options to pass on as is to db.view (like query parameters), success/error handlers
  // should not have a field called listener
  function l(val) { 
    if ( window.console && debugMode ) { console.log("ig: " + val); } 
    // if it is desired to log objects, they must first be JSON.stringify'ed
  }
  function render(template, arrayData, placeholder){
    l("rendering in " + placeholder);
    $(placeholder).empty();
    $(template).tmpl(arrayData).appendTo(placeholder);
  }
  function timestamp(){
    return (new Date()).getTime();
  }
  // TODO:
  //function getRecursively(doc, levels_deep) {
    //levels_deep = level_deep || 2;

  //}
  //function addToBulkQuery(){
  
  //}

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
                        if (dbname) {
                          db = $.couch.db(dbname);
                          l("db set to " + dbname);
                          return this;
                        } else {
                          return db; 
                        }
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
                          for (var selector in listeners){
                            if (listeners[selector].setListener){
                              // don't touch the placeholders that have been unregistered
                              var options = $.extend(
                                  { "placeholder": selector },
                                  listeners[selector]
                                  );
                              that.showViewResults(options);
                            }
                          }
                        },
    getListeners:     function(){ return listeners; },
    clearListeners:   function(){ l("cleared all listeners!"); listeners = {}; },
    setupForm:        function(options){
                        // TODO: completely revamp
                        // no gui here please
                        var that = this;
                        var form, inputElem;
                        if (!options.form) {
                          throw("no form specified to setupForm");
                        }
                        if (options.newItem){
                          form = $(options.newItem);
                          form.append($('<input type="text" title="Enter item value" value="Add New Item"/>'));
                          inputElem = $("input:last", form);
                          l(options.newItem + " form set up");
                          delete options.newItem;
                          form.submit(function(e){
                            l("submitting form " + form.selector); 
                            // note that the selector may become outdated by the time the form 
                            // is submitted, if there have been dom changes in the meantime
                            db.saveDoc({
                              "type":   "item",
                              // trim, remove repeated whitespace in value string
                              // this is a contentious issue, if this should be done or not
                              "value":  shortenItem(inputElem.val(), { "onlyTrim": true }),
                              "created_at": timestamp()
                            }, {
                              success:  function(data){
                                l("saved document, notifying app");
                                // now refresh the relevant view results
                                that.notify({
                                  "action": "Created",
                                  "data": inputElem.val()
                                });
                                inputElem.val("");
                              }
                            });
                            return false;
                          });
                          l("bound submit event handler to form: " + form.selector);
                        } else if (options.itemFilter && options.view){
                          form = $(options.itemFilter);
                          form.append($('<input type="text" title="Filter items" value="Search"/>'));
                          inputElem = $("input:last", form);
                          //inputElem.hover(function(){ this.val(''); });
                          l(options.itemFilter + " form set up");
                          delete options.itemFilter;
                          form.submit(function(e){
                            l("submitting form " + form.selector);
                            var val = shortenItem(inputElem.val());
                            if (val) {
                              options.startkey = val;
                              options.endkey = val + "\u9999"; // biggest UTF character starting with val
                              that.showViewResults(options);
                            } else {
                              options.view = "home/allItems";
                              options.startkey = '';
                              options.endkey = '\u9999';
                              that.showViewResults(options);
                            }
                            return false;
                          });
                          l("bound submit event handler to form: " + form.selector);
                        }
                        return this;
                      },
    showViewResults:  function(options){
                        // TODO: do not query db, just use values from cache
                        var that = this;
                        if (!options || !options.template || !options.placeholder){
                          throw("incomplete options parameter to showViewResults");
                        }
                        l("showing view results"); 
                        options = options || {};
                        var selector = options.placeholder;
                        var template = options.template;
                        delete options.placeholder;

                        if (typeof options.setListener !== 'undefined'){
                          // a setListener directive has to be sent to register or 
                          // unregister the placeholder from listeners
                          // previously set listeners will be changed as per options received
                          l("setting up listener for " + selector); 
                          if (listeners[selector]){
                            // options from earlier are preserved
                            $.extend(listeners[selector], options);
                          } else {
                            listeners[selector] = options;
                          }
                        }
                        var searchOpts = $.extend({}, options);
                        delete searchOpts.template;
                        delete searchOpts.setListener;
                        this.search(searchOpts, function(results){
                          render(template, results, selector);
                        });
                        return this;
                      },
    search:           function(options){ // (doc, callback, options)?
                        // TODO: all view queries to be done here (or only through here)
                        // use lazy fetching (the fetch function then pulls bulk docs)
                        // simply take the query (for items or relations) and 
                        // return the relevant documents based on the option parameters provided
                        if (!options || !options.view || !options.type){
                          throw("incomplete options parameter to search");
                        }
                        var docs = [];
                        var viewOpts = $.extend({}, options);
                        var view = viewOpts.view;
                        delete viewOpts.view;
                        viewOpts.include_docs = viewOpts.include_docs || true; // ISSUE: do this? i think yes
                        if (options.type === "item"){
                          db.view(view, $.extend(viewOpts, {
                            success: function(data){ 
                                       l("item query returned successfully with " + 
                                         data.rows.length + " items");
                                       docs = data.rows.map(function(row){ return row.doc; });
                                     }
                          }));
                        } else if (options.type === "relation"){
                          viewOpts.recursive = viewOpts.recursive || true;
                          
                          db.view(view, $.extend(viewOpts, {
                            success: function(data){
                                       l("relation query returned successfully with " + 
                                         data.rows.length + " relations");
                                       docs = data.rows.map(function(row){ return row.doc; });
                                       if (viewOpts.recursive) {
                                         docs.map(function(d){
                                           return getRecursively(d, viewOpts.level_deep);
                                         });
                                       }
                                     }
                          }));
                        }
                        return docs;
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
                            var flag = false;
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
                                       var relationText = selectedItems.map(function(item){ 
                                           return item.value; 
                                       }).join(" - ");
                                       selectedItems = [];
                                       that.notify({
                                         "action": "Created",
                                         "data": relationText
                                       });
                                     }
                          }, options));
                        }
                      },
    // This leaves the gui for selected items as it is. Not cool.
    //clearSelectedItems: function(){
                          //l("clearing item selection for new relation");

                          //selectedItems = [];
                        //},
    setupLogin:       function(options){
                        // TODO: No GUI in here please
                        options = options || {};

                        var loginButton = options.loginButton || "#loginButton";
                        // loginButton can be any element, not just a button
                        var loginData = options.loginData || {"name": "_", "password": "_"};

                        var loginSuccessHandler = function(res){ 
                          l("Login Successful");
                          $(loginButton).text("Logout");
                        };
                        var logoutSuccessHandler = function(res){ 
                          l("Logout Successful");
                          $(loginButton).text("Login");
                        };

                        var login = function(){
                          l("Logging in");
                          $.couch.login($.extend(loginData, {success: loginSuccessHandler}));
                        };
                        var logout = function(){
                          l("Logging out");
                          $.couch.logout({success: logoutSuccessHandler});
                        };

                        $.couch.session({
                          success: function(res){
                                     var toggleList = [];
                                     if (res.userCtx.roles.length === 0){
                                       l("userCtx.roles is empty");
                                       $(loginButton).text("Login");
                                       $(loginButton).toggle(login, logout);
                                     } else {
                                       l("userCtx.roles is non-empty");
                                       $(loginButton).text("Logout");
                                       $(loginButton).toggle(logout,login);  
                                     }
                                   }
                        });
                        return this;
                      }
  });
})(jQuery);
