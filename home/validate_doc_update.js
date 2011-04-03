function (newDoc, savedDoc, userCtx){
  var type = (savedDoc || newDoc)["type"];

  function beTrue(isTrue, message){
    var message = message || "";
    if (!isTrue) throw({forbidden: message});
  }

  function require(field, context, message){
    message = message || context.type + " missing a " + field;
    field.split(".").forEach(function(field){
      if (!context[field]) throw({forbidden: message});
      context = context[field];
    });
  }

  function unchanged(field){
    if (savedDoc && toJSON(savedDoc[field]) !== toJSON(newDoc[field]))
      throw ({ forbidden: "Field can't be changed: " + field });
  }

  function deepCheck(spo){
    if (spo.type === "item"){
      require("value", spo);
    } else if (spo.type === "relation"){
      require("subject", spo);
      require("predicate", spo);
      require("object", spo);
      deepCheck(spo.subject);
      deepCheck(spo.predicate);
      deepCheck(spo.object);
    }
  }
  
  deepCheck(newDoc);
  // TODO: can't edit docs, they're immutable
}
