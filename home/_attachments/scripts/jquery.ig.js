(function($) {
  $.ig = $.ig || {};

  var db;
  function l(val) { 
    if ($.ig.debug) { console.log(val); }
  };

  $.extend($.ig, {
    setDb:            function(dbname){
                        db = $.couch.db(dbname);
                        l("db set to " + dbname);
                        return this;
                      },
    getDb:            function(){ return db; },
    setupForm:        function(options){
                        var form;
                        if (options.newItem){
                          form = $('<form>').appendTo($(options.newItem));
                          l("created empty form element in " + options.newItem);
                        } else {
                          l("options.newItem not specified");
                        }
                        return this;
                      },
    pushViewResults:  function(view, options){
                        options = options || {};
                        options.placeholder = options.placeholder || "#itemList";
                        options.template = options.template || "#itemTemplate";
                        db.view(view,{ 
                          success: function(data){ 
                                     $(options.template).tmpl(data.rows).appendTo(options.placeholder);
                                   } 
                        });
                      },
    setupLogin:       function(options){
                        options = options || {};

                        var loginButton = options.loginButton || "#loginButton";
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
    debug:            true,
  });
})(jQuery);
