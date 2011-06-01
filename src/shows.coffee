templates = require 'kanso/templates'

exports.welcome = (doc, req)->
  content = templates.render 'welcome.html', req, {}
  if req.client
    $('#content').html(content)
    document.title = 'It worked!'
  else
    return templates.render 'base.html', req,
      title: 'It worked!'
      content: content

exports.not_found = (doc, req)->
  content = templates.render '404.html', req, {}
  if req.client
    $('#content').html(content)
    document.title = '404 - Not Found'
  else
    body = templates.render 'base.html', req,
      title: '404 - Not Found'
      content: content
    return code: 404, body: body

exports.item = (doc, req)->
  content = templates.render 'item.html', req, doc
  if req.client
    $("#content").html(content)
  else
    return templates.render 'base.html', req,
      title: "Item: #{doc.value}"
      content: content
