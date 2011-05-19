## IGapp - Couchapp based on Information Graph (IG)
# 
# Uses IG as a library and focuses only on providing a user interface to IG.
# Assumes the presence of $.ig
#
# The UI is as follows:
#
# * A list of all _items_ is shown in the left sidebar
#   - You can add new _item_ with the input box under it
#   - Search for items with the input search box above it
# * You can click on an item value to show in the main area all the _relations_ its a part of
#   - Clicking on an item/relation (basically, spo) in the _relations_ table in main area searches for that spo instead and the main area then shows all the relations that that spo is part of

# If jQuery says the dom is loaded
$(document).ready ->

  # Alias `console.log` and `alert` for ease of use during development. 
  # To be removed in production.
  window.cl = (str)-> console.log str
  window.al = (str)-> alert str

  # Local variable _ig_ for easier reference
  ig = $.ig

  prepare = (d)->
    doc = $.extend {}, d
    doc.igSelectionIndex = ig.selectionIndex[doc._id]
    if doc.type is "relation"
      doc.subjectDoc = d.getSubject()
      doc.predicateDoc = d.getPredicate()
      doc.objectDoc = d.getObject()
    doc
  
  # Helper function to handle all rendering of items/relations supposed to be on the page
  render = (doc, placeholder, template)->
    # If the element to be rendered is already on the page
    if onPage doc, placeholder
      # just refresh it right there, using `ig.refresh` (which has to be supplied to IG)
      ig.refresh doc
    else
      # else make a new doc
      d = prepare doc
      cl "appending #{d}"
      # and put it in the placeholder using the template specified
      $(placeholder).append $(template).tmpl(d)

  # Returns the html element corresponding to an IG doc, given its child element
  docElem = (elem)->
    $(elem).parents "[doc_id]:first"

  # Returns the html element corresponding to a doc, inside a given placeholder
  findOnPage = (doc, placeholder)->
    $ "[doc_id=#{doc._id}]", placeholder

  # Whether a jQuery selector query result turned out to be empty
  exists = (elem)->
    $(elem).length isnt 0

  # Whether a doc exists on the page, inside the given placeholder
  onPage = (doc, placeholder)->
    exists findOnPage doc, placeholder

  # Given a jQuery element representing an IG doc, tells you its _type_
  elemType = (e)->
    # out of `item`, `spo`, and `relation`
    for type in ["item", "spo", "relation"]
      return type if e.hasClass type
  
  # Returns the id of the doc clicked on
  idof = (e)->
    # by figuring out the doc element immediately surrounding the html element clicked on
    e = docElem e
    # and returning its `doc_id` attribute
    return e.attr "doc_id"

  # Start IG's debug mode
  ig.debug "start"
  # Set database
  ig.database "informationgraph"

  # Handler passed to IG that is called every time the user is to be notified of something
  ig.notification (text)->
    $("#notification").stop(true, true)
      .text(text)
      .fadeIn("fast").delay(3000).fadeOut("slow")

  # Sending a document refresh handler to IG, 
  # to be called everytime a doc on the page is to be refreshed
  ig.refresh (doc)->
    # Find all the elements on the page showing off that doc
    elems = findOnPage doc
    if onPage doc
      if doc._deleted
        # Remove the elements if the doc has been deleted (in couch)
        elems.remove()
      else
        elems.each (i, e)->
          # otherwise replace the earlier copies with a new one
          e = $ e
          template = $ "##{elemType(e)}Template"
          e.after template.tmpl prepare doc
          e.remove()
          # setting the data field needed by the jQuery template plugin
          $.tmplItem(e).data = doc
    
  # Handlers for _selecting_ or _unselecting_ a doc, so as to be included in a _relation_ being formed
  ig.docSelection(
    # Selection handler needs the doc as well as its position in [subject, predicate, object]
    (doc, index)->
      selectText = ["-", "s", "p", "o"]
      elems = findOnPage doc
      elems.each (i, e)->
        e = $ e
        e.addClass "#{elemType(e)}Selected"
        if elemType(e) is "relation"
          s = e.find(".constituents:first").prev().find(".docSelect:last")
        else
          s = e.find(".docSelect:last")
        s.find(".optionText").text(selectText[index])
    # Unselect handler only needs the doc to be unselected
    (doc)->
      unSelectText = "-"
      elems = findOnPage doc
      elems.each (i, e)->
        e = $ e
        e.removeClass "#{elemType(e)}Selected"
        # `.docSelect:last` because otherwise an spo's `.docSelect` might be chosen
        if elemType(e) is "relation"
          s = e.find(".constituents:first").prev().find(".docSelect:last")
        else
          s = e.find(".docSelect:last")
        s.find(".optionText").text(unSelectText)
  )

  # `linkPlaceholder` links a placeholder (just a container div) with a view query
  ig.linkPlaceholder "#itemList",
    view:         "home/allItems"
    # `beforeRender` initialises a placeholder for incoming docs before `render` is called on them one by one
    beforeRender: -> $("#itemList").empty()
    render:       (doc)-> render doc, "#itemList", "#itemTemplate"

  # `#itemFilter` is the search box on top of the left sidebar
  $("#itemFilter").change ->
    # Instead of making an exact query for the entered value,
    # the value is first _shortened_ so as to cater for slight misspellings or spacing problems
    val = shortenItem $(this).val()
    # If there's something in the search box (after _shortening_)
    if val
      # then `linkPlaceholder` `#itemList` with the view query for that search term
      ig.linkPlaceholder "#itemList",
        view:         "home/itemSuggestions"
        query:
          startkey:   val
          endkey:     val + "\u9999"
        beforeRender: -> $("#itemList").empty()
        render:       (doc)-> render doc, "#itemList", "#itemTemplate"
    else
      # but if the search box has nothing, then just link `#itemList` with the `allItems` query again
      ig.linkPlaceholder "#itemList",
        view:         "home/allItems"
        query:
          startkey:   ""
          endkey:     "\u9999"
        beforeRender: -> $("#itemList").empty()
        render:       (doc)-> render doc, "#itemList", "#itemTemplate"

  co = $ "#content"
  co.delegate ".newItem", "submit", ->
    input = $ this.newItemValue
    ig.newItem input.val(), (doc)->
      $(input).val("")
      # this line is needed for _changes to affect this new doc
      render doc, "#itemList", "#itemTemplate"
    false
  co.delegate ".docSelect", "click", ->
    ig.selectDoc idof this
    false
  co.delegate ".docDelete", "click", ->
    ig.deleteDoc idof this
    false
  co.delegate ".docSearch", "click", ->
    id = idof this
    ig.linkPlaceholder "#queryRelationList",
      view:         "home/relations"
      query:
        startkey: [id]
        endkey:   [id, {}]
      beforeRender: -> $("#queryRelationList").empty()
      render:       (doc)->
        render doc, "#queryRelationList", "#relationTemplate"
    false
  co.delegate ".spo .docSearch", "mouseover", ->
    e = docElem this
    r = docElem e.parent()
    ct = $ ".constituents:first", r
    doc = prepare e.tmplItem().data
    if doc.type is "relation"
      ct.slideUp "fast", ->
        ct.html $("#relationTemplate").tmpl doc
        ct.slideDown "slow", ->
          ig.handleGuiSelection doc
    false
  co.delegate ".relation .sentence .tick", "click", ->
    tick = $ this
    id = idof this
    ig.doc id, (doc)->
      if doc.sentence is "yes"
        ig.tag id, "sentence", "no"
      else
        ig.tag id, "sentence", "yes"
    false

  sb = $ "#itemList"
  sb.delegate ".itemValue", "dblclick", ->
    id = idof this
    ig.doc id, (doc)->
      e.after $("#itemEditTemplate").tmpl doc
      e.remove()
      findOnPage(doc, "#itemList").find("input:first").focus()
    false

#### TODO list: 
# 
# * Use Mustache
# * Implement hashchange (for back button, history navigation)
# * Complete this _docco_mentation
# * Change relation spo's and constituent div's background colors
# * Bug: Sentences selection doesn't show when the constituent docs slide down
