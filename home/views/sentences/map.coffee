(doc)->
  if doc.type is "relation" and doc.sentence is "yes"
    emit doc._id, null

# TODO: emit something else
