function manageLogin(options) {
  options = options || {};
  var l = function(val){ if (options.debug) { console.log(val); }}
  var loginSelector = options.loginSelector || "#login";
  var loginData = { name: "anup", password: "password" }

  var loginSuccessHandler = function(res){ 
    l("Login Successful");
    $(loginSelector).text("Logout");
  }
  var logoutSuccessHandler = function(res){ 
    l("Logout Successful");
    $(loginSelector).text("Login");
  };

  var login = function(){
    l("Logging in");
    $.couch.login($.extend(loginData, {success: loginSuccessHandler}));
  }
  var logout = function(){
    l("Logging out");
    $.couch.logout({success: logoutSuccessHandler});
  }

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
}
