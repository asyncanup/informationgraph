(function($) {
  $.ig = $.ig || {};

  var db;
  var nbSelector; // ui notification bar jquery selector
  function l(val) { 
    if ( window.console && $.ig.debug) { console.log(val); }
  };

  $.extend($.ig, {
    database:         function(dbname){ 
                        if (dbname) {
                          db = $.couch.db(dbname);
                          l("db set to " + dbname);
                          return this;
                        } else {
                          l("db was asked for");
                          return db; 
                        }
                      },
    notificationBar:  function(nb){
                        if (nb) { nbSelector = nb; return this; } 
                        else { return nbSelector || "#notification"; }
                      },
    notify:           function(content){
                        // TODO: trigger view results refresh
                        if (content){
                          if (content.type === "creation"){
                            var bar = $(this.notificationBar);
                            bar.hide().text("Created: ").append(content.data.toString());
                            l("displaying notification bar");
                            bar.show("fast").delay(2000).hide("fast");
                          }
                        }
                      },
    setupForm:        function(options){
                        if (options.newItem){
                          var form;
                          form = $(options.newItem);
                          form.append($('<input type="text" name="itemValue" value="new item value"/>'));
                          var inputElem = $("input:first", form);
                          form.append($('<input type="submit" class="submit" value="Put"/>'));
                          l("form set up in " + options.newItem);
                          form.submit(function(e){
                            db.saveDoc({
                              "type":   "item",
                              "value":  inputElem.val(),
                              "created_at": (new Date()).getTime()
                            }, {
                              "success":  function(data){
                                l("saved document. data returned: " + data);
                                l("notifying notification bar");
                                // now refresh the relevant view results
                                $.ig.notify({
                                  "type": "creation",
                                  "data": data
                                });
                                inputElem.val("");
                              }
                            });
                            return false;
                          });
                          l("bound submit event handler to form with id: " + options.formId);
                        } else if (options.itemFilter){
                          
                        }
                        return this;
                      },
    showViewResults:  function(view, options){
                        options = options || {};
                        options.placeholder = options.placeholder || "#itemList";
                        options.template = options.template || "#itemTemplate";
                        // TODO: register events with $.ig.notify to refresh view results when needed
                        db.view(view,{ 
                          success: function(data){ 
                                     l("view query returned successfully. Updating " + options.placeholder);
                                     $(options.placeholder).html("");
                                     $(options.template).tmpl(data.rows).appendTo(options.placeholder);
                                   } 
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
                                       l("session.userCtx.roles is empty");
                                       $(loginButton).text("Login");
                                       $(loginButton).toggle(login, logout);
                                     } else {
                                       l("session.userCtx.roles is non-empty");
                                       $(loginButton).text("Logout");
                                       $(loginButton).toggle(logout,login);  
                                     }
                                   }
                        });
                        return this;
                      },
    debug:            true
  });
})(jQuery);
