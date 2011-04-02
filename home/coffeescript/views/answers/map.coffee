(doc)->
  # TODO: this is where all the makeAnswers action should happen
  emit [doc.query, doc.relation], doc.answer if doc.type is "answer"
