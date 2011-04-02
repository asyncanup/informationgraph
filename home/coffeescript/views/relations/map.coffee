(doc)->
  if doc.type is "relation"
    emit [doc.subject, "s"], null
    emit [doc.predicate, "p"], null
    emit [doc.object, "o"], null
