var templates;
templates = require('kanso/templates');
exports.welcome = function(doc, req) {
  var content, title;
  title = 'Welcome';
  content = templates.render('welcome.html', req, {});
  if (req.client) {
    $('#content').html(content);
    return document.title = title;
  } else {
    return templates.render('base.html', req, {
      title: title,
      content: content
    });
  }
};
exports.not_found = function(doc, req) {
  var body, content, title;
  title = '404 - Not Found';
  content = templates.render('404.html', req, {});
  if (req.client) {
    $('#content').html(content);
    return document.title = title;
  } else {
    body = templates.render('base.html', req, {
      title: title,
      content: content
    });
    return {
      code: 404,
      body: body
    };
  }
};
exports.spo = function(doc, req) {};
exports.item = function(doc, req) {
  var content, title;
  title = "Item: " + doc.value;
  content = templates.render('item.html', req, doc);
  if (req.client) {
    $("#content").html(content);
    return document.title = title;
  } else {
    return templates.render('base.html', req, {
      title: title,
      content: content
    });
  }
};
exports.relation = function(doc, req) {
  var content, title;
  title = "Relation: " + (typeof doc.toString === "function" ? doc.toString() : void 0);
  content = templates.render('relation.html', req, doc);
  if (req.client) {
    $("#content").html(content);
    return document.title = title;
  } else {
    return templates.render('base.html', req, {
      title: title,
      content: content
    });
  }
};