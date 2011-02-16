function (newDoc, savedDoc, userCtx){
  var type = (savedDoc || newDoc)["type"];

  function beTrue(isTrue, message){
    var message = message || "";
    if (!isTrue) throw({forbidden: message});
  }

  function require(field, message){
    message = message || newDoc.type + " must have a " + field + ".";
    if (!newDoc[field]) throw({forbidden: message});
  }

  function unchanged(field){
    if (savedDoc && toJSON(savedDoc[field]) !== toJSON(newDoc[field]))
      throw ({ forbidden: "Field can't be changed: " + field });
  }

  if (newDoc.type === "item"){
    require("value");
  }

  if (newDoc.type === "relation"){
    require("subject");
    require("predicate");
    require("object");
  }

  require("created_at");
  unchanged("created_at");
}
