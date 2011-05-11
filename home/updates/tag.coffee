(doc, req)->
  tag = req.query.name
  value = req.query.value
  if name? and value?
    doc[name] = value
    return [doc, "success"]
  else
    return [doc, "Tag and Value parameters not specified"]
