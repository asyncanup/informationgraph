{shortenItem} = require "./shortenItem"

exports.sentences =
  map: (doc)->
    if doc.type is "relation" and doc.sentence is "yes"
      # TODO: emit something else
      emit doc._id, null

exports.relations =
  map: (doc)->
    if doc.type is "relation"
      emit [doc.subject, "s"], null
      emit [doc.predicate, "p"], null
      emit [doc.object, "o"], null

exports.itemSuggestions =
  map: (doc)->
    if doc.type is "item"
      str = shortenItem doc.value
      for i in [0...str.length]
        emit str.slice(i), null

exports.allItems =
  map: (doc)-> emit doc.value, null if doc.type is "item"

#TODO: answers view
