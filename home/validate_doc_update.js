function (newDoc, savedDoc, userCtx){
  var type = (savedDoc || newDoc)["type"];

  function beTrue(isTrue, message){
    var message = message || "";
    if (!isTrue) throw({forbidden: message});
  }

  function require(field, message){
    message = message || newDoc.type + " must have a " + field;
    var context = newDoc;
    field.split(".").forEach(function(field){
      if (!context[field]) throw({forbidden: message});
      context = context[field];
    });
  }

  function unchanged(field){
    if (savedDoc && toJSON(savedDoc[field]) !== toJSON(newDoc[field]))
      throw ({ forbidden: "Field can't be changed: " + field });
  }

  if (newDoc.type === "item"){
    require("value");
  }

  if (newDoc.type === "relation"){
    //require("subject._id");
    //require("subject.value");
    //require("predicate._id");
    //require("predicate.value");
    //require("object._id");
    //require("object.value");
    require("subject");
    require("predicate");
    require("object");
  }

  if (newDoc.type === "answer"){
    require("query");
    require("answer");
    require("relation");
  }

  // TODO: can't edit docs, they're immutable
}
