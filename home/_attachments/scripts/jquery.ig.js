(function($) {
  $.ig = $.ig || {};

  var db = "informationgraph";
  var nbSelector = "#notification"; // ui notification bar jquery selector
  var debugMode = true; // whether debug mode is on
  var listeners = {};
  // listenes has jquery dom selectors as keys and options hashes as values
  // options have these fields:
  //    view - what view to query. passed as is to db.view
  //    template - what jquery template to use for data display
  //    and other options to pass on as is to db.view (like query parameters), success/error handlers
  // should not have a field called listener
  function l(val) { 
    if ( window.console && debugMode ) { console.log("ig: " + val); } 
    // if it is desired to log objects, they must first be JSON.stringify'ed
  };
  function render(template, arrayData, placeholder){
    l("rendering in " + placeholder);
    $(placeholder).html("");
    $(template).tmpl(arrayData).appendTo(placeholder);
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
                        if (dbname) {
                          db = $.couch.db(dbname);
                          l("db set to " + dbname);
                          return this;
                        } else {
                          return db; 
                        }
                      },
    notificationBar:  function(nb){
                        if (nb) { 
                          nbSelector = nb; 
                          l(nbSelector + " set as notification bar");
                          return this; 
                        }
                        else { return nbSelector || "#notification"; }
                      },
    notify:           function(content){
                        // at every trigger of this function,
                        // all registered view query listeners will be fired and refreshed
                        var that = this;
                        function showNotification(text){
                          l("displaying notification bar");
                          $(nbSelector)
                            .stop(true, true)
                            .text(content.action.toString() + ": '" + content.data.toString() + "'")
                             // use of toString() is contentious, think about it. remove?
                            .fadeIn("fast").delay(3000).fadeOut("slow");
                        }
                        if (content){
                          showNotification(content);
                          l(content.action);
                          if ($.inArray(content.action, ["Created", "Deleted", "Edited"]) > -1){
                            that.refreshViewResults();
                          }
                        }
                      },
    refreshViewResults: function(){
                          var that = this;
                          l("refreshing view results");

                          for (key in listeners){
                            if (listeners[key].setListener){
                              // to not touch the placeholders that have been unregistered
                              var options = $.extend(
                                  { "placeholder": key },
                                  listeners[key]
                                  );
                              that.showViewResults(options);
                            }
                          }
                        },
    getListeners:     function(){ return listeners; },
    setupForm:        function(options){
                        var that = this;
                        if (options.newItem){
                          var form = $(options.newItem);
                          form.append($('<input type="text" title="Enter item value" value="Add New Item"/>'));
                          var inputElem = $("input:last", form);
                          l(options.newItem + " form set up");
                          delete options["newItem"];
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
                          var form = $(options.itemFilter);
                          form.append($('<input type="text" title="Filter items" value="Search"/>'));
                          var inputElem = $("input:last", form);
                          //inputElem.hover(function(){ this.val(''); });
                          l(options.itemFilter + " form set up");
                          delete options["itemFilter"];
                          form.submit(function(e){
                            l("submitting form " + form.selector);
                            var val = shortenItem(inputElem.val());
                            if (val) {
                              options["startkey"] = val;
                              options["endkey"] = val + "\u9999"; // biggest UTF character starting with val
                              that.showViewResults(options);
                            } else {
                              options["view"] = "home/allItems";
                              options["startkey"] = '';
                              options["endkey"] = '\u9999';
                              that.showViewResults(options);
                            }
                            return false;
                          });
                          l("bound submit event handler to form: " + form.selector);
                        }
                        return this;
                      },
    showViewResults:  function(options){
                        l("showing view results"); 
                        options = options || {};
                        options.placeholder = options.placeholder || "#itemList";
                        options.template = options.template || "#itemTemplate";
                        options.view = options.view || "home/allItems";
                        var selector = options.placeholder;
                        var template = options.template;
                        var view = options.view;
                        delete options["placeholder"];

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
                        var viewOpts = $.extend({}, options)
                        delete viewOpts["template"];
                        delete viewOpts["view"];
                        delete viewOpts["setListener"];
                        // extraneous options deleted. 
                        // now the remaining can be sent to db.view as is
                        db.view(view, $.extend(viewOpts, {
                          success: function(data){ 
                                     l("view query returned successfully with " + data.rows.length + " rows");
                                     var docs = data.rows.map(function(row){ return row.doc; });
                                     render(template, docs, selector);
                                   } 
                        }));
                        return this;
                      },
    deleteItem:       function(doc, options){
                        var that = this;
                        options = options || {};
                        bishdoc = doc;
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
                        var template = options.template || "#itemEditTemplate";
                        l("editing item '" + doc.value + "'");
                        $("#" + doc._id).replaceWith($(template).tmpl(doc));
                        var tr = $("#" + doc._id); // you have to assign the variable after replaceWith
                        var form = tr.find("form:first");
                        var inputElem = form.find("input:last");  
                        inputElem.focus();
                        form.submit(function(e){
                          var val = shortenItem(inputElem.val(), { "onlyTrim": true });
                          l("saving item '" + doc.value + "' with new value '" + val + "'");
                          db.saveDoc({
                            "_id":    doc._id,
                            "_rev":   doc._rev,
                            "type":   doc.type,
                            "value":  val,
                            "created_at": doc.created_at,
                            "updated_at": timestamp()
                          }, 
                          $.extend({
                            success:  function(data){
                                        l("saved edited document, notifying app");
                                        // now refresh the relevant view results
                                        that.notify({
                                          "action": "Edited",
                                          "data": val
                                        });
                                        doc.value = val;
                                        tr.replaceWith($("#itemTemplate").tmpl(doc)); 
                                        // how about not assuming #itemTemplate?
                                      }
                          }, options)
                          );
                          return false;
                        });
                      },
    setupLogin:       function(options){
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
