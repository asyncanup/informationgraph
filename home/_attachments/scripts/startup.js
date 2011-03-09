$(document).ready(function(){

  $.ig.debug("start")
      .database("informationgraph")
      .notification(function(text){
        $("#notification")
          .stop(true, true)
          .text(text)
          .fadeIn("fast").delay(3000).fadeOut("slow");
      })
      .setupLogin({ 
        "loginData": getLoginData(),
        }, 
        function(){
          $("#loginButton").text("Logout");
          return $("#loginButton");
        },
        function(){
          $("#loginButton").text("Login");
          return $("#loginButton");
        }
      )
      .showViewResults({
        "view":           "home/allItems", 
        "template":       "#itemTemplate",
        "placeholder":    "#itemList",
        "empty":          true,
        "setListener":    true,
        "type":           "item"
      });

  $("#itemFilter").change(function(){
    var val = shortenItem($(this).val());
    if (val) {
      $.ig.showViewResults({
        "view":           "home/itemSuggestions",
        "startkey":       val,
        "endkey":         val + "\u9999",
        "placeholder":    "#itemList",
        "empty":          true,
        "template":       "#itemTemplate",
        "setListener":    true,
        "type":           "item"
      });
    } else {
      $.ig.showViewResults({
        "view":           "home/allItems",
        "startkey":       "",
        "endkey":         "\u9999",
        "placeholder":    "#itemList",
        "empty":          true,
        "template":       "#itemTemplate",
        "setListener":    true,
        "type":           "item",
      })
    }
  });

  $("#content")
    // sends the data used to render the template earlier, 
    // which is basically the item doc
    .delegate(".newItem", "submit", function(){
      if($.ig.newItem($(this.newItemValue).val())){
        // if saved
        $(this.newItemValue).val("");
      }
      return false;
    })
    .delegate(".itemSelect", "click", function(){
      var tmplItem = $.tmplItem(this);
      var doc = $.extend({}, tmplItem.data);
      var elem = $("." + doc._id); // all elements with this class

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
      return false; // to prevent the click from bubbling up
    })
    .delegate(".itemDelete", "click", function(){
      var doc = $.extend({}, $.tmplItem(this).data);
      $.ig.deleteItem(doc);
      return false;
    })
    .delegate(".itemValue", "dblclick", function(){
      var tmplItem = $.tmplItem(this);
      tmplItem.tmpl = $("#itemEditTemplate").template();
      tmplItem.update();
      $(tmplItem.nodes).find("input").focus();
      // can i safely use tmplItem.nodes?
      return false;
    })
    .delegate(".itemSearch", "click", function(){
      var doc = $.extend({}, $.tmplItem(this).data);
      $("#queryRelationList").empty();
      $.ig.search({
        "view":       "home/relations",
        "type":       "relation",
        "startkey":   [doc._id],
        "endkey":     [doc._id, {}]
      }, function(relation){
        $("#relationListTemplate").tmpl(relation).appendTo("#queryRelationList");
      });
      return false;
    })
    .delegate(".itemEditForm", "submit", function(){
      var input = $(this).find("input.itemInput");
      var val = shortenItem(input.val(), { "onlyTrim": true });
      var tmplItem = $.tmplItem(this);
      var doc = $.extend({}, tmplItem.data);
      doc.value = val;
      $.ig.editItem(doc);
      return false;
    });
      
});

