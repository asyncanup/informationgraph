$(document).ready ->
  cl = (str) -> console.log str
  ig = $.ig
  
  exists = (elem) ->
    $(elem).length isnt 0

  render = (doc, placeholder, template) ->
    if onPage doc, placeholder
      ig.refresh doc
    else
      $(placeholder).append $(template).tmpl(doc)

  docElem = (elem) ->
    $(elem).parents "[doc_id]:first"

  findOnPage = (doc, placeholder) ->
    if onPage doc, placeholder
      $ "[doc_id=#{doc._id}]", placeholder
    else 
      throw "document not on page"

  onPage = (doc) ->
    exists findOnPage doc

  elemType = (e) ->
    types = [
      "item"
      "spo"
      "relation"
    ]
    for type in types
      return type if e.hasClass type
  
  ig.debug "start"
  ig.database "informationgraph"

  ig.notification (text) ->
    $("#notification").stop(true, true)
      .text(text)
      .fadeIn("fast").delay(3000).fadeOut("slow")

  ig.setupLogin
    loginData:  getLoginData()
    -> $("#loginButton").text("Logout")
    -> $("#loginButton").text("Login")

  ig.refresh (doc) ->
    elems = findOnPage doc
    if onPage doc
      if doc._deleted
        elems.remove()
      else
        elems.each (i, e) ->
          e = $(e)
          template = $ "##{elemType(e)}Template"
          e.after template.tmpl doc
          e.remove()
          $.tmplItem(e).data = doc
    
  ig.docSelection (doc, index) ->
    selectText = ["-", "s", "p", "o"]
    elems = findOnPage doc
    elems.each (i, e) ->
      e = $(e)
      e.addClass "#{elemType(e)}Selected"
