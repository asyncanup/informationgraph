(doc)->
  if doc.type is "relation"
    emit [doc.subject._id, "s"], null
    emit [doc.predicate._id, "p"], null
    emit [doc.object._id, "o"], null
