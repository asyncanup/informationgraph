$(document).ready(function(){

  cl = function(x){ console.log(x); }

  // TODO: 
  var ig = $.ig;

  // NOTE: Extending JQuery in this statement
  $.fn.exists = function(){ return $(this).length !== 0; }

  function render(doc, placeholder, template) {
    if (onPage(doc, placeholder)){
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

  function onPage(doc, placeholder){
    return $("[doc_id=" + doc._id + "]", placeholder).exists();
  }
  function findOnPage(doc, placeholder){
    if(onPage(doc, placeholder)){
      return $("[doc_id=" + doc._id + "]", placeholder);
    } else {
      throw("document not on page");
    }
  }
  function elemType(e){
    var types = ["item", "spo", "relation"];
    var t;
    $.each(types, function(i, type){
      if (e.hasClass(type)){
        t = type;
        return false;
      }
    });
    if (t){ return t; }
    else { throw("element type none out of " + types.join("/")); }
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
            // what if a doc part of a relation is removed by this (as far as i can tell, it won't)
          }
          else {
            findOnPage(doc).each(function(i, e){
              e = $(e);
              e.after($("#" + elemType(e) + "Template").tmpl(doc)).remove();
              $.tmplItem(e).data = doc;
            });
          }
        }
      })
      .docSelection(
          function(doc, index){
            var selectText = ["-", "s", "p", "o"];
            findOnPage(doc).each(function(i, e){
              e = $(e);
              e .addClass(elemType(e) + "Selected")
                .find(".docSelect:last")
                // last because otherwise a relation's subject's docSelect might be chosen
                .find(".optionText")
                .text(selectText[index]);
            });
          }, 
          function(doc){
            var unSelectText = "-";
            findOnPage(doc).each(function(i, e){
              e = $(e);
              e .removeClass(elemType(e) + "Selected")
                .find(".docSelect:last")
                .find(".optionText")
                .text(unSelectText);
            });
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
      var input = $(this.newItemValue);
      ig.newItem(input.val(), function(doc){
        // if and when saved
        $(input).val("");
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
      var e = docElem(this);
      ig.deleteDoc(e.attr("doc_id")); 
      // no callback needed here because ig.refresh(doc) is going to be 
      // called anyway when the _changes feed comes in
      return false;
    })
    .delegate(".itemValue", "dblclick", function(){
      var e = docElem(this);
      var p;
      ig.doc(e.attr("doc_id"), function(doc){
        p = e.parent();
        e.after($("#itemEditTemplate").tmpl(doc)).remove();
        findOnPage(doc, p).find("input:first").focus();
      });
      return false;
    })
    .delegate(".docSearch", "click", function(){
      var e = docElem(this);
      ig.linkPlaceholder("#queryRelationList", {
          "view":           "home/relations",
          "query":          {
                              "startkey": [e.attr("doc_id")],
                              "endkey":   [e.attr("doc_id"), {}]
                            },
          "beforeRender":   function(){ $("#queryRelationList").empty(); },
          "render":         function(doc){ render(doc, "#queryRelationList", "#relationTemplate"); }
      });
      return false;
    })
    .delegate(".itemEditForm", "submit", function(){
      var e = docElem(this);
      var input = $(this).find("input.itemInput");
      var val = shortenItem(input.val(), { "onlyTrim": true });
      ig.editItem(e.attr("doc_id"), val);
      return false;
    });


  //ig.refresh();    

});

