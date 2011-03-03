$(document).ready(function(){

  $.ig.debug("start")
      .database("informationgraph")
      .notification(function(text){
        $("#notification")
          .stop(true, true)
          .text(text)
          .fadeIn("fast").delay(3000).fadeOut("slow");
      })
      // TODO: setupLogin, setupForm and showViewResults to be changed
      // $.ig should have no knowledge or assumptions about GUI
      // and edit the templates
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
    // sends the data used to render the template earlier, 
    // which is basically the item doc
    .delegate(".itemSelect", "click", function(){
      var tmplItem = $.tmplItem(this);
      var doc = $.extend({}, tmplItem.data);
      var tr = $(tmplItem.nodes);

      var selectText = ["-", "s", "p", "o"];

      // sending in a callback function to toggle gui of a selected or unselected item
      $.ig.selectItem(doc, function(index){ 
        if (tr.hasClass("selected")){
          tr.removeClass("selected")
            .find(".itemSelect")
            .text(selectText[index]);
        } else {
          tr.addClass("selected")
            .find(".itemSelect")
            .text(selectText[index]);
        }
      });
    })
    .delegate(".itemDelete", "click", function(){
      var doc = $.extend({}, $.tmplItem(this).data);
      $.ig.deleteItem(doc);
    })
    .delegate(".itemValue", "dblclick", function(){
      var tmplItem = $.tmplItem(this);
      tmplItem.tmpl = $("#itemEditTemplate").template();
      tmplItem.update();
      $(tmplItem.nodes).find("input").focus();
      // can i safely use tmplItem.nodes?
    })
    .delegate(".itemEditForm", "submit", function(){
      var input = $(this).find("input.itemInput");
      var val = shortenItem(input.val(), { "onlyTrim": true });
      var tmplItem = $.tmplItem(this);
      var doc = $.extend({}, tmplItem.data);

      if (doc.value === val){
        // no changes
        tmplItem.tmpl = $("#itemTemplate").template();
        tmplItem.update();
        return false;
      }

      doc.value = val;
      $.ig.editItem(doc);
      return false;
    });
      
  function toItem(tr){
    return {
      "_id":    tr.attr("id"),
      "_rev":   tr.attr("rev"),
      "type":   "item",
      "value":  tr.find(".itemValue").text() || tr.attr("originalValue"), 
      // because itemEditTemplate doesn't have .itemValue td
      "created_at": parseInt(tr.attr("created_at"))
    };
  }

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
