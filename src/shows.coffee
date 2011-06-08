templates = require 'kanso/templates'

exports.welcome = (doc, req)->
  title = 'Welcome'
  content = templates.render 'welcome.html', req, {}
  #TODO: welcome.html will have instructions for using the app
  if req.client
    $('#content').html(content)
    document.title = title
  else
    return templates.render 'base.html', req, {title, content}

exports.not_found = (doc, req)->
  title = '404 - Not Found'
  content = templates.render '404.html', req, {}
  if req.client
    $('#content').html(content)
    document.title = title
  else
    body = templates.render 'base.html', req, {title, content}
    return code: 404, body: body

exports.spo = (doc, req)->
  #TODO: should handle items and relations both appropriately

exports.item = (doc, req)->
  title = "Item: #{doc.value}"
  content = templates.render 'item.html', req, doc
  if req.client
    $("#content").html(content)
    document.title = title
  else
    return templates.render 'base.html', req, {title, content}

exports.relation = (doc, req)->
  #TODO: set doc.toString
  title = "Relation: #{doc.toString?()}"
  content = templates.render 'relation.html', req, doc
  if req.client
    $("#content").html content
    document.title = title
  else
    return templates.render 'base.html', req, {title, content}
