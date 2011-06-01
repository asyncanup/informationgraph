var templates;
templates = require('kanso/templates');
exports.welcome = function(doc, req) {
  var content;
  content = templates.render('welcome.html', req, {});
  if (req.client) {
    $('#content').html(content);
    return document.title = 'It worked!';
  } else {
    return templates.render('base.html', req, {
      title: 'It worked!',
      content: content
    });
  }
};
exports.not_found = function(doc, req) {
  var body, content;
  content = templates.render('404.html', req, {});
  if (req.client) {
    $('#content').html(content);
    return document.title = '404 - Not Found';
  } else {
    body = templates.render('base.html', req, {
      title: '404 - Not Found',
      content: content
    });
    return {
      code: 404,
      body: body
    };
  }
};
exports.item = function(doc, req) {
  var content;
  content = templates.render('item.html', req, doc);
  if (req.client) {
    return $("#content").html(content);
  } else {
    return templates.render('base.html', req, {
      title: "Item: " + doc.value,
      content: content
    });
  }
};