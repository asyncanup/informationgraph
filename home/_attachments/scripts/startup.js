$(document).ready(function(){

  function render(doc, placeholder, template) {
    if (onPage(doc)){ 
      $.ig.refresh(doc); 
    }
    else { 
      $(placeholder).append($(template).tmpl(doc)); 
    }
  }

  // NOTE: Extending JQuery in this statement
  $.fn.exists = function(){ return $(this).length !== 0; }
  function onPage(doc){
    return $("[doc_id=" + doc._id + "]").exists();
  }

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
      .refresh(function(doc){
        if (onPage(doc)){
          elem.replaceWith($("#" + doc.type + "Template").tmpl(doc));
        }
      })
      .linkPlaceholder("#itemList", {
        "view":           "home/allItems",
        "beforeRender":   function(){ #("#itemList").empty(); },
        "render":         render(doc, "#itemList", "#itemTemplate")
      });

  $("#itemFilter").change(function(){
    var val = shortenItem($(this).val());
    if (val) {
      $.ig.linkPlaceholder("#itemList", {
          "view":           "home/itemSuggestions",
          "query":          {
                              "startkey": val,
                              "endkey":   val + "\u9999"
                            },
          "beforeRender":   function(){ #("#itemList").empty(); },
          "render":         render(doc, "#itemList", "#itemTemplate")
      });
    } else {
      $.ig.linkPlaceholder("#itemList", {
          "view":           "home/allItems",
          "query":          {
                              "startkey": "",
                              "endkey":   "\u9999"
                            },
          "beforeRender":   function(){ #("#itemList").empty(); },
          "render":         render(doc, "#itemList", "#itemTemplate")
      });
    }
  });

  $("#content")
    .delegate(".newItem", "submit", function(){
      if($.ig.newItem($(this.newItemValue).val())){
        // if saved
        $(this.newItemValue).val("");
      }
      return false;
    })
    .delegate(".itemSelect", "click", function(){
      // TODO: everything below this to be refactored asap
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

