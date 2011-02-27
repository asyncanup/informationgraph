$(document).ready(function(){
  $.ig.debug("start")
      .database("informationgraph")
      .notificationBar("#notification")
      .setupLogin({ 
        "loginData": getLoginData(),
        "loginButton": "#loginButton"
      })
      .setupForm({ 
        "newItem":  "#newItem"
      })
      .setupForm({
        "itemFilter": "#itemFilter",
        "view": "home/itemSuggestions",
        "placeholder": "#itemList",
        "template": "#itemTemplate", // #itemSuggestionsTemplate ?
        "include_docs": true,
        "setListener": true
      })
      .showViewResults({
        "view": "home/allItems", 
        "template": "#itemTemplate",
        "placeholder": "#itemList",
        "include_docs": true,
        "setListener": true
      });
  $("#itemList")
    .click(function(e){
      var td = $(e.target);
      var tr = td.parent();
      if (td.hasClass("itemDelete")){
        $.ig.deleteItem(tr.attr("id"), tr.attr("rev"));
      }
    })
    .dblclick(function(e){
      var td = $(e.target);
      var tr = td.parent();
      if (td.hasClass("itemValue")){
        
      }
    })



});


//var editmap = {
  //"q": ["1", "a", "s", "w", "2"],
  //"w": ["2", "q", "a", "s", "d", "e", "3"],
  //"e": ["3", "w", "s", "d", "f", "r", "4"],
  //"r": ["4", "e", "d", "f", "g", "t", "5"],
  //"t": ["5", "r", "f", "g", "h", "y", "6"],
  //"y": ["6", "t", "g", "h", "j", "u", "7"],
  //"u": ["7", "y", "h", "j", "k", "i", "8"],
  //"i": ["8", "u", "j", "k", "l", "o", "9"],
  //"o": ["9", "i", "k", "l", "p", "0"],
  //"p": ["0", "o", "l"],

  //"m": []
//}

//var test = function(){
  //$.ajax({
    //type: "POST",
    //url: "http://127.0.0.1:5984/informationgraph/",
    //success: function(d) {console.log(d); alert(d);},
    //dataType: "json",
    //contentType: "application/json",
    //error: function(err){console.log(err); alert(err);},
    //data: JSON.stringify({
      //"subject": "couch",
      //"predicate": "is",
      //"object": "relaxing"
    //})
  //}); 
//}
