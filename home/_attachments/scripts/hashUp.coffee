# TODO: this file will be //!code included in answers map view
query = (spo)->
  if spo is null or spo.isNull
    null
  else if spo.type is "item"
    spo.value
  else if spo.type is "relation"
    return (query spo[x] for x in ["subject", "predicate", "object"])

check = (doc, emit)->
  spoAt = ["subject", "predicate", "object"]

  prepare = (spo, parent)->
    spo.currentIndex = spo.nullIndex = -1
    spo.isNull = false
    spo.parent = parent
    if spo.type is "relation"
      prepare spo.subject, spo
      prepare spo.predicate, spo
      prepare spo.object, spo

  emitAnswer = ->
    q = query R
    cl "#{R[spoAt[R.nullIndex]]} answers #{JSON.stringify q}"
    emit q, R[spoAt[R.nullIndex]]

  shiftNull = (r)->
    if r is false
      ### meaning shiftNull was called on R.up (boundary condition) ###
      cl "done making answers"
    else
      r.currentIndex = 0
      if r.nullIndex is -1
        r.nullIndex = 0
        r.subject.isNull = true
        emitAnswer()
        more r
      else if r.nullIndex < 2
        r[spoAt[r.nullIndex]].isNull = false
        r.nullIndex += 1
        r[spoAt[r.nullIndex]].isNull = true
        emitAnswer()
        more r
      else if r.nullIndex is 2
        r[spoAt[r.nullIndex]].isNull = false
        r.nullIndex = -1
        shiftNull r.parent

  more = (r)->
    if r.nullIndex is -1
      shiftNull r
    else if r.currentIndex is r.nullIndex
      r.currentIndex += 1
      more r
    else if r.currentIndex is 3
      shiftNull r
    else if r[spoAt[r.currentIndex]].type is "item"
      r.currentIndex += 1
      more r
    else if r[spoAt[r.currentIndex]].type is "relation"
      more r[spoAt[r.currentIndex]]

  R = doc
  prepare doc, false
  more R

