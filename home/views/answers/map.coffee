(doc)->
  # TODO:
  #
  # * Don't emit results for [null, null, null] queries
  #
  # Browser testing stuff. To be removed
  al = -> true
  cl = console.log
  emit = (q, a)->
    cl "query:"; cl q
    cl "answer: "; cl a
    cl "--------"
  say = (arg)->
    if arg?
      if arg.push?
        return (say d for d in arg)
      else if arg.slice?
        return arg
      else
        if arg.value
          return arg.value
        else
         return "R"
    else
      return null

  # Traverse the doc and transform its structure into a flat array.
  # 
  # Every element in this array represents a doc and has the liberty 
  # to be present in the query or not. Lets call this array `doclist`
  traverse = (doc, doclist, pos, alldocs)->
    # Initialise `doclist`, current hierarchical level of the passed doc, and
    # take alldocs to be `doc.docs` by default
    doclist ?= []
    pos ?= ""
    alldocs ?= doc.docs
    if doc.type is "relation"
      for spo in ["subject", "predicate", "object"]
        do (spo)->
          d_id = doc[spo]
          # Every element in `doclist` consists of these properties:
          d =
            # it's document id (as stored in database)
            id: d_id
            # whether it's an item or relation
            type: alldocs[d_id].type
            # it's hierarchical level in the doc structure
            pos: pos + spo[0]
          # Only items have `value`
          d.value = alldocs[d_id].value if d.type is "item"
          doclist.push d
          doclist = traverse alldocs[d_id], doclist, pos + spo[0], alldocs
    doclist

  # `untraverse` does the opposite by transforming the linear array representation
  # into a nested array that corresponds with the doc structure
  # It takes the doc structure from the format array passed.
  # Example format array: ["s", "p", "o", "os", "op", "oo"] for the relation
  # ( ram - said - ( hanuman - love - icecream ) )
  untraverse = (doclist, format)->
    al "doclist: #{say doclist}"
    # If we're untraversing a simple subject, predicate, object triplet
    # where all three are items
    if doclist.length is 3 and (f.slice(-1) for f in format).join("") is "spo"
      [slevel, plevel, olevel] = (f.length for f in format)
      if slevel is plevel is olevel
        # then just check for the integrity of the received format and
        al "returning small: #{say doclist}"
        # return the string representations of the subject, predicate and object
        return (say d for d in doclist)
      else
        # make some noise if data integrity failed
        throw "slevel, plevel, olevel aren't same"
      # Initialise `result`, the final nested array to be returned
    result = []

    start = 0
    # For subject, predicate, and object, in order
    for i in [0...3]
      # figure out their boundaries in `doclist`
      from ?= start
      to = from + 1
      al "from: #{from}"
      to += 1 while to < doclist.length and format[to].length isnt format[from].length
      al "to: #{to}"

      # and push the further `untraverse`d individual subject, object and predicate
      # components into `result`
      if from+1 < to-1
        result.push untraverse doclist[from+1..to-1], format[from+1..to-1]
      else
        # Note that an item doesn't need `untraverse`ing, you just put it in the
        # nested array at it's place
        result.push say doclist[from]
      from = to
    al "returning full result: #{JSON.stringify result}"
    result

  # Given a `doclist`, `getAnswersFrom` generates all the `query`, `answer`, `format`
  # pairs and returns them to the specified callback.
  #
  # This function will basically recurse on every element of the `doclist` passed
  # and thus have a different recursion path for all the possibilities where any of
  # the elements may or may not be in the query.
  getAnswersFrom = (doclist, callback, query, answer, format, k)->
    # `recurse` here just saves typing
    recurse = (q, a, f, n)->
      getAnswersFrom doclist,
        callback,
        query.concat(q),
        answer.concat(a),
        format.concat(f)
        n
    query ?= []
    answer ?= []
    format ?= []
    k ?= 0

    # The recursion stops only when all `doclist` elements have been recursed through
    if k is doclist.length
      callback query, answer, format
    else
      thisdoc = doclist[k]
      # If the current doc in `doclist` is an item, you just start 2 recursion paths,
      # one where it's included in the `query` and one where it's not
      # Note that you also pass it's exact hierarchical position in the original
      # `doclist` so that the query array is parsed right later when needed
      if thisdoc.type is "item"
        recurse thisdoc, null, thisdoc.pos, k+1
        recurse null, thisdoc, thisdoc.pos, k+1
      else if thisdoc.type is "relation"
        # But if the current doc is a relation
        n = k+1
        # then either we just take it, and simply recurse on to it's subject, etc
        recurse thisdoc, null, thisdoc.pos, n
        # or we don't select it, and thus also skip recursion for all it's constituents
        n += 1 while n<doclist.length and doclist[n].pos.length isnt doclist[k].pos.length
        recurse null, thisdoc, thisdoc.pos, n

  # With the helper functions defined, this is where execution actually begins
  #
  # If the document passed to this view map is a relation,
  if doc.type is "relation"
    # traverse the doc and make the flat array structure called `doclist`
    doclist = traverse doc

    # `getAnswersFrom` the doclist and pass a callback in, to be called
    # for every (query, answer, format)
    getAnswersFrom doclist, (query, answer, format)->
      al "emitting query: #{say query}"
      al "and answer: #{say answer}"
      al "with format: #{say format}"

      # Turn the flat query array generated into a nested `queryarr`, using its `format`
      queryarr = untraverse query, format
      # and likewise for `answer`
      answerarr = untraverse answer, format

      # Emit the damn pair
      emit queryarr, answerarr
      
