$(document).ready(function(){

  // TODO: searching for an edited item doesn't work
  var ig = $.ig;

  // NOTE: Extending JQuery in this statement
  $.fn.exists = function(){ return $(this).length !== 0; }

  function render(doc, placeholder, template) {
    if (onPage(doc)){ 
      // if it's already on the page, just use the 
      // document refresh handler specified later
      ig.refresh(doc); 
    }
    else { 
      // else create a place for it
      $(placeholder).append($(template).tmpl(doc)); 
    }
  }

  function docElem(elem){
    return $(elem).parents("[doc_id]:first");
  }

  function onPage(doc){
    return $("[doc_id=" + doc._id + "]").exists();
  }
  function findOnPage(doc){
    if(onPage(doc)){
      return $("[doc_id=" + doc._id + "]");
    } else {
      throw("document not on page");
    }
  }

  ig.debug("start")
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
        // this is the document refresh handler for the app
        if (onPage(doc)){
          if (doc._deleted){ 
            findOnPage(doc).remove();
          }
          else { 
            findOnPage(doc).after($("#" + doc.type + "Template").tmpl(doc)).remove();
          }
        }
      })
      .itemSelection(
          function(doc, index){
            var selectText = ["-", "s", "p", "o"];
            findOnPage(doc)
                .addClass("selected")
                .find(".docSelect")
                .text(selectText[index]);
          }, 
          function(doc){
            var unSelectText = "-";
            findOnPage(doc)
                .removeClass("selected")
                .find(".docSelect")
                .text(unSelectText);
          }
      )
      .linkPlaceholder("#itemList", {
        "view":           "home/allItems",
        "beforeRender":   function(){ $("#itemList").empty(); },
        "render":         function(doc){ render(doc, "#itemList", "#itemTemplate"); }
      });

  $("#itemFilter").change(function(){
    var val = shortenItem($(this).val());
    if (val) {
      ig.linkPlaceholder("#itemList", {
          "view":           "home/itemSuggestions",
          "query":          {
                              "startkey": val,
                              "endkey":   val + "\u9999"
                            },
          "beforeRender":   function(){ $("#itemList").empty(); },
          "render":         function(doc){ render(doc, "#itemList", "#itemTemplate"); }
      });
    } else {
      ig.linkPlaceholder("#itemList", {
          "view":           "home/allItems",
          "query":          {
                              "startkey": "",
                              "endkey":   "\u9999"
                            },
          "beforeRender":   function(){ $("#itemList").empty(); },
          "render":         function(doc){ render(doc, "#itemList", "#itemTemplate"); }
      });
    }
  });

  $("#content")
    .delegate(".newItem", "submit", function(){
      ig.newItem($(this.newItemValue).val(), function(doc){
        // if and when saved
        $(this.newItemValue).val("");
        render(doc, "#itemList", "#itemTemplate");
        // this line is needed for _changes to affect this doc
        // otherwise ig.refresh would have to be run for every new item added
      });
      return false;
    })
    .delegate(".docSelect", "click", function(){
      var e = docElem(this);
      ig.selectDoc(e.attr("doc_id"));
      return false;
    })
    .delegate(".docDelete", "click", function(){
      var elem = docElem(this);
      ig.deleteDoc(elem.attr("doc_id")); 
      // no callback needed here because ig.refresh(doc) is going to be 
      // called anyway when the _changes feed comes in
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
      ig.search("home/relations", {
        "startkey":   [doc._id],
        "endkey":     [doc._id, {}]
      }, function(relation){
        $("#relationListTemplate").tmpl(relation).appendTo("#queryRelationList");
      });
      return false;
    })
    .delegate(".itemEditForm", "submit", function(){
      var elem = docElem(this);
      var input = $(this).find("input.itemInput");
      var val = shortenItem(input.val(), { "onlyTrim": true });
      ig.editItem(elem.attr("doc_id"), val);
      return false;
    });


  ig.refresh();    

});

