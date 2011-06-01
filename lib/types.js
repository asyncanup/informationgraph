var Type, fields, widgets;
Type = require('kanso/types').Type;
fields = require('kanso/fields');
widgets = require('kanso/widgets');
exports.item = new Type('item', {
  fields: {
    created: fields.timestamp(),
    creator: fields.creator(),
    value: fields.string({
      required: true,
      widget: widgets.text()
    })
  }
});
exports.relation = new Type('relation', {
  fields: {
    created: fields.timestamp(),
    creator: fields.creator(),
    subject: fields.string({
      required: true
    }),
    predicate: fields.string({
      required: true
    }),
    object: fields.string({
      required: true
    }),
    docs: fields.array(),
    sentence: fields.boolean({
      omit_empty: true,
      description: "Whether this relation is a sentence"
    })
  }
});