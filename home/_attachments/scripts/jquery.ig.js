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
                            .text(content.action.toString() + ": '" + content.data.toString() + "'")
                             // use of toString() is contentious, think about it. remove?
                            .stop(true, true)
                            .fadeIn("fast").delay(3000).fadeOut("slow");
                        }
                        if (content){
                          if (content.action === "Created" || content.action === "Deleted"){
                            showNotification(content);
                            that.refreshViewResults();
                          }
                        }
                      },
    refreshViewResults: function(){
                          var that = this;
                          l("refreshing view results");
                          for (key in listeners){
                            var opts = $.extend(
                                { "listener": false, "placeholder": key},
                                listeners[key]
                                );
                            var view = opts["view"];
                            delete opts["view"];
                            that.showViewResults(view, opts);
                          }
                        },
    setupForm:        function(options){
                        var that = this;
                        if (options.newItem){
                          var form;
                          form = $(options.newItem);
                          form.append($('<input type="text" id="newItemInput" value="new item value"/>'));
                          var inputElem = $("input:first", form);
                          //form.append($('<input type="submit" class="submit" value="Put"/>'));
                          l(options.newItem + " form set up");
                          form.submit(function(e){
                            db.saveDoc({
                              "type":   "item",
                              // trim, remove repeated whitespace in value string
                              // this is a contentious issue, if this should be done or not
                              "value":  inputElem.val().trim().replace(/\s+/g, ' '),
                              "created_at": (new Date()).getTime()
                            }, {
                              "success":  function(data){
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
                        } else if (options.itemFilter){
                          // TODO
                        }
                        return this;
                      },
    showViewResults:  function(view, options){
                        options = options || {};
                        options.placeholder = options.placeholder || "#itemList";
                        options.template = options.template || "#itemTemplate";
                        var selector = options.placeholder;
                        var template = options.template;
                        if (options.listener !== false){
                          // to listen is the default. 
                          // unless listener explicitly set to false
                          delete options["listener"];
                          delete options["placeholder"];
                          l("registering listener for " + selector); 
                          listeners[selector] = $.extend(options, {"view": view});
                          // since the key is options.placeholder, 
                          // previously set listeners can be changed by sending different view queries 
                          // (with more specific options maybe?) with the same placeholder
                        }
                        delete options["template"];
                        // extraneous options deleted. 
                        // now the remaining can be sent to db.view as is
                        db.view(view, $.extend(options, {
                          success: function(data){ 
                                     l("view query returned successfully with " + data.total_rows + " rows");
                                     render(template, data.rows, selector);
                                   } 
                        }));
                        return this;
                      },
    deleteItem:       function(id, rev, options){
                        var that = this;
                        l("deleting item - (" + id + ", " + rev + ")");
                        db.removeDoc(
                            { "_id": id, "_rev": rev },
                            { 
                              success: function(data){
                                         l("deleted item");
                                         that.notify({
                                           "action": "Deleted",
                                           "data": id
                                         });
                                       }
                            }
                            );
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
