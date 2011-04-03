/*
   App using Information Graph js library
*/$(document).ready(function() {
  var co, docElem, elemType, exists, findOnPage, ig, onPage, render;
  window.cl = function(str) {
    return console.log(str);
  };
  window.al = function(str) {
    return alert(str);
  };
  ig = $.ig;
  render = function(doc, placeholder, template) {
    if (onPage(doc, placeholder)) {
      return ig.refresh(doc);
    } else {
      return $(placeholder).append($(template).tmpl(doc));
    }
  };
  docElem = function(elem) {
    return $(elem).parents("[doc_id]:first");
  };
  findOnPage = function(doc, placeholder) {
    return $("[doc_id=" + doc._id + "]", placeholder);
  };
  exists = function(elem) {
    return $(elem).length !== 0;
  };
  onPage = function(doc, placeholder) {
    return exists(findOnPage(doc, placeholder));
  };
  elemType = function(e) {
    var type, _i, _len, _ref;
    _ref = ["item", "spo", "relation"];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      type = _ref[_i];
      if (e.hasClass(type)) {
        return type;
      }
    }
  };
  ig.debug("start");
  ig.database("informationgraph");
  ig.notification(function(text) {
    return $("#notification").stop(true, true).text(text).fadeIn("fast").delay(3000).fadeOut("slow");
  });
  ig.setupLogin({
    loginData: getLoginData()
  }, function() {
    return $("#loginButton").text("Logout");
  }, function() {
    return $("#loginButton").text("Login");
  });
  ig.refresh(function(doc) {
    /* this is the document refresh handler for the app */    var elems;
    elems = findOnPage(doc);
    if (onPage(doc)) {
      if (doc._deleted) {
        return elems.remove();
      } else {
        return elems.each(function(i, e) {
          var template;
          e = $(e);
          template = $("#" + (elemType(e)) + "Template");
          e.after(template.tmpl(doc));
          e.remove();
          return $.tmplItem(e).data = doc;
        });
      }
    }
  });
  ig.docSelection(function(doc, index) {
    var elems, selectText;
    selectText = ["-", "s", "p", "o"];
    elems = findOnPage(doc);
    return elems.each(function(i, e) {
      e = $(e);
      e.addClass("" + (elemType(e)) + "Selected");
      return e.find(".docSelect:last").find(".optionText").text(selectText[index]);
    });
  }, function(doc) {
    var elems, unSelectText;
    unSelectText = "-";
    elems = findOnPage(doc);
    return elems.each(function(i, e) {
      e = $(e);
      e.removeClass("" + (elemType(e)) + "Selected");
      /*
        .docSelect:last because otherwise a relation's
        subject's docSelect button might be chosen
      */
      return e.find(".docSelect:last").find(".optionText").text(unSelectText);
    });
  });
  ig.linkPlaceholder("#itemList", {
    view: "home/allItems",
    beforeRender: function() {
      return $("#itemList").empty();
    },
    render: function(doc) {
      return render(doc, "#itemList", "#itemTemplate");
    }
  });
  $("#itemFilter").change(function() {
    var val;
    val = shortenItem($(this).val());
    if (val) {
      return ig.linkPlaceholder("#itemList", {
        view: "home/itemSuggestions",
        query: {
          startkey: val,
          endkey: val + "\u9999"
        },
        beforeRender: function() {
          return $("#itemList").empty();
        },
        render: function(doc) {
          return render(doc, "#itemList", "#itemTemplate");
        }
      });
    } else {
      return ig.linkPlaceholder("#itemList", {
        view: "home/allItems",
        query: {
          startkey: "",
          endkey: "\u9999"
        },
        beforeRender: function() {
          return $("#itemList").empty();
        },
        render: function(doc) {
          return render(doc, "#itemList", "#itemTemplate");
        }
      });
    }
  });
  co = $("#content");
  co.delegate(".newItem", "submit", function() {
    var input;
    input = $(this.newItemValue);
    ig.newItem(input.val(), function(doc) {
      $(input).val("");
      /* this line is needed for _changes to affect this new doc */
      return render(doc, "#itemList", "#itemTemplate");
    });
    return false;
  });
  co.delegate(".docSelect", "click", function() {
    var e, id;
    e = docElem(this);
    id = e.attr("doc_id");
    ig.selectDoc(id);
    return false;
  });
  co.delegate(".docDelete", "click", function() {
    var e, id;
    e = docElem(this);
    id = e.attr("doc_id");
    ig.deleteDoc(id);
    return false;
  });
  return co.delegate(".docSearch", "click", function() {
    var e, id;
    e = docElem(this);
    id = e.attr("doc_id");
    ig.linkPlaceholder("#queryRelationList", {
      view: "home/relations",
      query: {
        startkey: [id],
        endkey: [id, {}]
      },
      beforeRender: function() {
        return $("#queryRelationList").empty();
      },
      render: function(doc) {
        return render(doc, "#queryRelationList", "#relationTemplate");
      }
    });
    return false;
  });
});