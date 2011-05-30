types = require 'kanso/types'
app_types = require './types'

require = (field, context, message)->
  message ?= "#{context.type} missing a #{field}"
  for prop in field.split "."
    if not context[prop]
      throw forbidden: message
    context = context[prop]

deepCheck = (spo_id, alldocs)->
  spo = alldocs[spo_id]
  if spo.type is "item"
    require "value", spo
  else if spo.type is "relation"
    require "subject", spo
    require "predicate", spo
    require "object", spo
    deepCheck spo.subject, alldocs
    deepCheck spo.predicate, alldocs
    deepCheck spo.object, alldocs
  else
    throw forbidden: "not an item or relation"

module.exports = (newDoc, oldDoc, userCtx)->
  types.validate_doc_update app_types, newDoc, oldDoc, userCtx
  deepCheck newDoc, doc.docs
