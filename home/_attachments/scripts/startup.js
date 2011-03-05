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
        "template": "#itemListTemplate", // #itemSuggestionsTemplate ?
        "include_docs": true,
        "setListener": true
      })
      .showViewResults({
        "view": "home/allItems", 
        "template": "#itemListTemplate",
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
      var elem = $(tmplItem.nodes);

      var selectText = ["-", "s", "p", "o"];

      // sending in a callback function to toggle gui of a selected or unselected item
      $.ig.selectItem(doc, function(index){ 
        if (elem.hasClass("selected")){
          elem.removeClass("selected")
            .find(".itemSelect")
            .text(selectText[0]);
        } else {
          elem.addClass("selected")
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
      
});

