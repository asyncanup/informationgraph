(function($) {
  $.ig = $.ig || {};

  var db;
  function l(val) { 
    if ($.ig.debug) { console.log(val); }
  };

  $.extend($.ig, {
    viewResults:  function(options){
                    options = options || {};

                  },
    setDb:        function(dbname){
                    db = $.couch.db(dbname);
                    l("db set to " + dbname);
                    return this;
                  },
    setupForm:    function(options){
                    var form;
                    if (options.newItem){
                      form = $('<form>').appendTo($(options.newItem));
                      l("created empty form element in " + options.newItem);
                    } else {
                      l("options.newItem not specified");
                    };
                    return this;
                  },
    setupLogin:   function(options){
                    options = options || {};

                    var loginSelector = options.loginSelector || "#login";
                    var loginData = options.loginData || {"name": "_", "password": "_"};

                    var loginSuccessHandler = function(res){ 
                      l("Login Successful");
                      $(loginSelector).text("Logout");
                    };
                    var logoutSuccessHandler = function(res){ 
                      l("Logout Successful");
                      $(loginSelector).text("Login");
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
                                   $(loginSelector).text("Login");
                                   $(loginSelector).toggle(login, logout);
                                 } else {
                                   l("session.userCtx.roles is non-empty");
                                   $(loginSelector).text("Logout");
                                   $(loginSelector).toggle(logout,login);  
                                 }
                               }
                    });
                    return this;
                  },
    //shortenItem:  function(str){
                    //var i = 0;
                    //var lastChar = str.charAt(0);
                    //l("initial string: " + str);

                    //// remove all consecutive duplicates
                    //for (i = 1; i < str.length; i += 1){
                      //if (str.charAt(i) === lastChar) {
                        //str = str.replace(lastChar, '');
                        //i -= 1;
                      //}
                      //lastChar = str.charAt(i);
                    //}

                    //// remove vowels and spaces
                    //str = str.replace(/[aeiou ]/g, ''); 

                    //l("shortened string: " + str);
                    //return str;
                  //},
    debug:        true,
  });
})(jQuery);
