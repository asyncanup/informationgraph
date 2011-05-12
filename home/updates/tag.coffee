(doc, req)->
  tag = req.form.tag
  value = req.form.value
  if tag? and value?
    doc[tag] = value
    return [doc, "success"]
  else
    return [doc, "error"]
