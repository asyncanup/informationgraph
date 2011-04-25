(doc)->
  #`// !code _attachments/scripts/hashUp.js
  #`
  #spoAt = ["subject", "predicate", "object"]

  #prepare = (spo, parent)->
    #spo.currentIndex = spo.nullIndex = -1
    #spo.isNull = false
    #spo.parent = parent
    #if spo.type is "relation"
      #prepare spo.subject, spo
      #prepare spo.predicate, spo
      #prepare spo.object, spo

  #shiftNull = (r, answers)->
    #if r is false
      #### meaning shiftNull was called on R.up (boundary condition) ###
      #l "done making answers"
    #else
      #r.currentIndex = 0
      #if r.nullIndex is -1
        #r.nullIndex = 0
        #r.subject.isNull = true
        #emitAnswer()
        #more r
      #else if r.nullIndex < 2
        #r[spoAt[r.nullIndex]].isNull = false
        #r.nullIndex += 1
        #r[spoAt[r.nullIndex]].isNull = true
        #emitAnswer()
        #more r
      #else if r.nullIndex is 2
        #r[spoAt[r.nullIndex]].isNull = false
        #r.nullIndex = -1
        #shiftNull r.parent
    #answers

  #emitAnswer = ->
    #q = ig.query R
    #l "#{R[spoAt[R.nullIndex]]} answers #{JSON.stringify q}"
    #emit q, R[spoAt[R.nullIndex]]

  #more = (r)->
    #if r.nullIndex is -1
      #shiftNull r
    #else if r.currentIndex is r.nullIndex
      #r.currentIndex += 1
      #more r
    #else if r.currentIndex is 3
      #shiftNull r
    #else if r[spoAt[r.currentIndex]].type is "item"
      #r.currentIndex += 1
      #more r
    #else if r[spoAt[r.currentIndex]].type is "relation"
      #more r[spoAt[r.currentIndex]]

  #R = prepare relation, false
  #more R

