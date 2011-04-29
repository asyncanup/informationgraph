(doc)->
  #`// !code _attachments/scripts/hashUp.js
  #`

  # Plan of Action:
  #
  # * Traverse the doc and get an array of its referenced docs' ids.
  #   Every element in this array has the liberty to be present in 
  #   the query or not. Lets call this array `idlist`
  # * There will be (2^n - 1) query possibilities to be satisfied by
  #   `idlist` where n is the `idlist.length`

  docs = doc.docs
  
  # `traverse` goes through a doc and returns the mentioned array
  traverse = (doc, arr)->
    if doc.type is "relation"
      arr.push docs[doc.subject]._id
      arr.push docs[doc.predicate]._id
      arr.push docs[doc.object]._id
      # The order of the docids is determined by breadth-first traversal
      # of the doc (subject, then predicate, then object, then subject docs, etc)
      traverse docs[doc.object],
        traverse docs[doc.predicate],
          traverse docs[doc.subject], arr
    else
      arr

  # The doc supplied to the view needs to be a relation
  if doc.type is "relation"
    # If so, we can build `idlist`
    idlist = traverse doc, []
    n = idlist.length
    # and for all numbers from 1 to 2^n - 1
    for i in [1...Math.pow(2,n)]
      # we get their binary representation (padded to length n)
      str = i.toString(2)
      str = (new Array(n+1-str.length)).join("0") + str

      # Now this binary representation `str` is basically the code about
      # what spos we should make `null` in each of these 2^n-1 queries

      # Initialise query array
      query = []
      # Initialise answer array
      answer = []

      # We will now fill these two arrays with appropriate docids. Note that 
      # the length of `query` and `answer` won't be `n` for every `str`
      # because if a subject somewhere is rendered `null` by `str`,
      # then its own doc tree (if it was a relation itself) has to vanish 
      # from `query` and the subject doc itself, then, will be part of `answer`
      for c, index in str
        if c is "0"
          # Lets take `0` to be the code for `null` in query,
          # and hence, we put a docid in `answer` at the appropriate place
          answer[index] = idlist[index]
        else
          # And for `1` in the binary representation we put a docid in `query`
          query[index] = idlist[index]

  # TODO: Incomplete
