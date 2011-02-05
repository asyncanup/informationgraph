import cgi
import os
import logging
#import urllib2

from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext import db
from google.appengine.ext.webapp import template
from urllib import urlencode
from django.utils import simplejson
#from google.appengine.api import urlfetch

class Item(db.Model):
  value = db.StringProperty(multiline=True)

class Relation(db.Model):
  subject = db.ReferenceProperty(Item, collection_name="relation_subject_set")
  predicate = db.ReferenceProperty(Item, collection_name="relation_predicate_set")
  object = db.ReferenceProperty(Item, collection_name="relation_object_set")

class MainPage(webapp.RequestHandler):
  def get(self):
    items = db.GqlQuery("SELECT * FROM Item")
    relations = db.GqlQuery("SELECT * FROM Relation")
    template_values = {
        'relations': relations,
        'items': items
      }
    error = self.request.get('error')
    if error:
      template_values['error'] = error
    path = os.path.join(os.path.dirname(__file__), 'main.html')
    self.response.out.write(template.render(path, template_values))

def itemsearch(q):
  #### change this query to be full text search not just beginning of line
  #### and change the Item.value property to be TextProperty if a new way to do 
  #### this search is found, other than using these comparison operators
  items = Item.gql("WHERE value >= :1 AND value < :2", q, q + u"\ufffd")
  # items = Item.all()

  #### find some better way to do this, that is, collect a said number of items at once
  items_arr = []
  for item in items:
    items_arr += [item]
  return items_arr

def autocomplete_response(query, suggestions, data):
  return simplejson.dumps({
    "query": query,
    "suggestions": suggestions,
    "data": data
  })

def parse_key_trace(key_trace):
  if key_trace[0] != '(' and key_trace[1] != ')':
    return key_trace
  arr = split(key_trace)
  return [parse_key_trace(el) for el in arr] # 3 element array

class AddRelation(webapp.RequestHandler):
  def get(self):
    arr = []
    for spo in ["subject", "predicate", "object"]:
      if self.request.get(spo + '_new'):
        arr += [Item(value=self.request.get(spo + '_new')).put()]
      else:
        arr += [Item.get(self.request.get(spo + '_item_key'))]
    s,p,o = arr
    # now s, p, and o contain the items to be related (ie, put in a relation triplet)

    # raise "don't add relations for now"
    if s and p and o:
      existing_relation = Relation.all().filter('subject =', s).filter('predicate =', o).filter('object =', o).get()
      if not existing_relation == None:
        self.redirect('/?' + 
          urlencode({ 'relation_already_exists': existing_relation.key() })
        )
      relation = Relation(subject=s, predicate=p, object=o)
      relation.put()
      self.redirect('/?' + urlencode({ 'relation_added': relation.key() }))
    else:
      self.redirect('/?' + urlencode({ 'error': 'Please specify all three items: subject, predicate, and object' }))

class AddItem(webapp.RequestHandler):
  def get(self):
    v = self.request.get('value')
    if v:
      item = Item(value=v)
      item.put()
      self.redirect('/?' + urlencode({ 'item_added': item.key() }))
    else:
      self.redirect('/?' + urlencode({ 'error': 'item value not specified.' }))

class DeleteRelation(webapp.RequestHandler):
  def get(self):
    key = self.request.get('key')
    if key:
      relation = Relation.get(key)
      relation.delete()
    self.redirect('/')

class DeleteItem(webapp.RequestHandler):
  def get(self):

    # get key and item
    key = self.request.get('key')
    if not key:
      raise "no key specified to delete item"
    item = Item.get(key)

    # find relations wherever the given item occurs as subject, predicate or object
    subject_references_query = Relation.gql("WHERE subject = :1", item)
    predicate_references_query = Relation.gql("WHERE predicate = :1", item)
    object_references_query = Relation.gql("WHERE object = :1", item)
    reference_queries = [ 
      subject_references_query, 
      predicate_references_query, 
      object_references_query 
    ]

    # are there no relations to be affected by deleting this item?
    zero_relations = True
    for query in reference_queries:
      if not query.count(1) == 0:
        zero_relations = False

    # if this is the confirmation page, delete the item and the relations
    if (self.request.get('confirmation') == "true"):
      for query in reference_queries:
        for relation in query:
          relation.delete()
      item.delete()
      self.redirect('/')
    else:
      # else show the confirmation page
      hash = {}
      for query in reference_queries:
        for relation in query:
          hash[relation] = 1
      relations = hash.keys()
      #### there will be more relations that will need to be deleted
      #### for example the ones that start with this one's predicate as their subject
      template_values = {
        'item'      : item,
        'relations' : relations,
        'relation_count' : len(relations)
      }

      # skip the confirmation page if there is no relation to be affected
      if zero_relations:
        self.redirect('/deleteitem?' + urlencode({ 
            'key': item.key(), 
            'confirmation': 'true' })
        )

      path = os.path.join(os.path.dirname(__file__), 'deleteitem.html')
      self.response.out.write(template.render(path, template_values))

class SearchRelations(webapp.RequestHandler):
  def get(self):
    ####
    hey = "hey"

class SearchItems(webapp.RequestHandler):
  def get(self):
    q = self.request.get('query')
    #### support more output formats than json
    items = itemsearch(q)
    item_values_arr = [item.value for item in items]
    item_keys_arr = [str(item.key()) for item in items]
    self.response.out.write(autocomplete_response(q, item_values_arr, item_keys_arr))

class AutoComplete(webapp.RequestHandler):
  def get(self):
    q = self.request.get('query')
    '''
    key_trace = self.request.get('key_trace')

    # if only subject is present in the key_trace, that is, 
    # this is the first time after itemsearch
    # a proper key_trace would be a nested (in brackets) triplet structure
    if key_trace[0] != '(' and key_trace[-1] != ')':
      ##
    else:
      nested_query_arr = parse_key_trace(key_trace)
      
    '''
    #'''
    subject_key = self.request.get('subject')
    subject = Item.get(subject_key)
    relations = Relation.gql('WHERE subject = :1', subject)
    po_arr = [] # predicate object sets
    po_keys_arr = []
    for relation in relations:
      po_arr += [relation.predicate.value + " " + relation.object.value]
      po_keys_arr += [str(relation.predicate.key())] #[[str(relation.predicate.key()), str(relation.object.key())]]
    self.response.out.write(
      autocomplete_response(q, po_arr, po_keys_arr)
    )
    #'''

class AutoCompleteAddPO(webapp.RequestHandler):
  def get(self):
    subject_key = self.request.get('subject_key_when_adding')
    po_value = self.request.get('q')
    #### get rid of this assumption of predicate being only one word
    predicate_value = po_value[0 : po_value.index(" ")]
    object_value = po_value[len(predicate_value)+1 : ]
    predicate = Item(value=predicate_value)
    object = Item(value=object_value)
    predicate.put()
    object.put()
    subject = Item.get(subject_key)
    relation = Relation(subject=subject, predicate=predicate, object=object)
    relation.put()
    self.redirect('/?' + urlencode({ 'relation_added': str(relation.key()) }))

logging.getLogger().setLevel(logging.DEBUG)
application = webapp.WSGIApplication(
      [ ('/', MainPage),
        ('/addrelation', AddRelation),
        ('/additem', AddItem),
        ('/deleterelation', DeleteRelation),
        ('/deleteitem', DeleteItem),
        ('/searchrelations', SearchRelations),
        ('/searchitems', SearchItems),
        ('/autocomplete', AutoComplete),
        ('/autocomplete_add_po', AutoCompleteAddPO)
      ],
      debug=True)

def main():
  run_wsgi_app(application)

if __name__ == "__main__":
  main()

