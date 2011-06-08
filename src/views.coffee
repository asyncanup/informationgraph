#{shorten} = require "./item"

exports.sentences =
  map: (doc)->
    if doc.type is "relation" and doc.sentence is "yes"
      # TODO: emit something else, maybe number of relations in the sentence
      emit null, null

exports.relations =
  map: (doc)->
    if doc.type is "relation"
      emit [doc.subject, "s"], null
      emit [doc.predicate, "p"], null
      emit [doc.object, "o"], null

exports.itemSuggestions =
  map: (doc)->
    #TODO: Remove this
    shorten = (str, options)->
      options ?= {}
      throw "shortenItem needs str" unless str?
      str = str.trim().replace /\s+/g, ' '
      if options.onlyTrim
        str
      else
        i = 1
        lastChar = str.charAt 0
        l = str.length
        while i < l
          if str.charAt(i) is lastChar
            str = str.substr(0, i) + str.slice(i).replace lastChar, ''
            i -= 1
            l -= 1
          lastChar = str.charAt i
          i += 1

        str = str.replace /[aeiou ]/g, ''
        str
    if doc.type is "item"
      str = shorten doc.value
      for i in [0...str.length]
        emit str.slice(i), null

exports.allItems =
  map: (doc)-> emit doc.value, null if doc.type is "item"

#TODO: answers view
