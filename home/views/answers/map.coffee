(doc)->
  #`// !code _attachments/scripts/hashUp.js
  #`

  # Traverse the doc and transform its structure into an array form
  # Every element in this array represents a doc and has the liberty 
  # to be present in the query or not. Lets call this array `doclist`
  traverse = (doc, doclist, pos, alldocs)->
    if doc.type is "relation"
      for spo in ["subject", "predicate", "object"]
        id = doc[spo]
        doclist.push
          id: id
          pos: pos + spo[0]
        doclist = traverse alldocs[id], doclist, pos + spo[0], alldocs
    doclist

  recurse = (query, answer, doclist, k, alldocs)->
    if k is doclist.length
      emit query, answer
    else
      thisdoc = alldocs[doclist[k].id]
      if thisdoc.type is "item"
        # 0
        recurse query.concat(null), answer.concat(thisdoc), doclist, k+1, alldocs
        # 1
        recurse query.concat(thisdoc), answer.concat(null), doclist, k+1, alldocs
      else if thisdoc.type is "relation"
        # 1
        recurse query.concat(thisdoc), answer.concat(null), doclist, k+1, alldocs
        # 0
        n = k+1
        n += 1 while doclist[n].pos.length isnt doclist[k].pos.length
        recurse query.concat(null), answer.concat(thisdoc), doclist, n, alldocs

  if doc.type is "relation"

    doclist = traverse doc, [], "", doc.docs
    recurse [], [], doclist, 0, doc.docs


    # And for all numbers from 1 to 2^n - 1
    #for num in [1...Math.pow(2,n)]
      # we get their binary representation (padded to length n)
      #str = num.toString(2)
      #str = (new Array(n+1-str.length)).join("0") + str

      # Now this binary representation `str` is basically the code about
      # what spos we should make `null` in each of these 2^n-1 queries

      # Initialise `query`
      #query = []
      # Initialise `answer`
      #answer = []

      #setarr = (str[i...i+3] for i in [0...str.length/3])
      #for set, setindex in setarr
        #unless set is "000" or
          #(set[0] is "0" and docs setarr[setindex+1] isnt "000") or
          #set is "101"
            #true
          #for c, spoindex in set
            #index = 3*setindex + spoindex
            #if c is "1"
              #query[index] = idlist[index]
            #else
              #answer[index] = idlist[index]


      # We will now fill these two with appropriate docids.
      # `current` is the current relation of the doc that `c` will decide the fate of
      #current = query
      #for c, index in str
        #unless c[index...index+3] is "000"
          #true
        #if c is "0"
          # Taking `0` to be the code for `null` in query
          #current.push null
        #else
          #current.push idlist[index]
        # `pos` is the position of `current` in `query`, the position being filled
        # (subject, predicate, object corresponding to 0, 1, 2 respectively)
        #pos = index%3
        #if current.length is 3
          #[s, p, o] = current
          #unless s is null and p is null and o is null
           #if docs[idlist[index]]


  # TODO: Incomplete
