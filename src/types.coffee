{Type} = require 'kanso/types'
fields = require 'kanso/fields'
widgets = require 'kanso/widgets'

exports.item = new Type 'item'
  fields:
    created: fields.timestamp()
    creator: fields.creator()
    value: fields.string
      required: true
      widget: widgets.text()

exports.relation = new Type 'relation'
  fields:
    created: fields.timestamp()
    creator: fields.creator()

    subject: fields.string
      required: true

    predicate: fields.string
      required: true

    object: fields.string
      required: true

    docs: fields.embedList
      type: 'item'
      description: "The subject, predicate, object and the contained docs"

    sentence: fields.boolean
      omit_empty: true
      description: "Whether this relation is tagged as 'sentence'"
