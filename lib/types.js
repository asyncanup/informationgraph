var Type, fields, widgets;
Type = require('kanso/types').Type;
fields = require('kanso/fields');
widgets = require('kanso/widgets');
exports.item = new Type('item', {
  fields: {
    created: fields.timestamp(),
    value: fields.string({
      widget: widgets.text()
    })
  }
});