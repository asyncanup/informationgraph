###
   App using Information Graph js library
###

$(document).ready ->
  # TODO: 

  window.cl = (str)-> console.log str
  window.al = (str)-> alert str

  ig = $.ig
  
  render = (doc, placeholder, template)->
    if onPage doc, placeholder
      ig.refresh doc
    else
      d = $.extend {}, doc
      if doc.type is "relation"
        #al d.getSubject().toString()
        d.subjectDoc = d.getSubject()
        d.predicateDoc = d.getPredicate()
        d.objectDoc = d.getObject()
      cl "appending #{d}"
      $(placeholder).append $(template).tmpl(d)

  docElem = (elem)->
    $(elem).parents "[doc_id]:first"

  findOnPage = (doc, placeholder)->
    $ "[doc_id=#{doc._id}]", placeholder

  exists = (elem)->
    $(elem).length isnt 0

  onPage = (doc, placeholder)->
    exists findOnPage doc, placeholder

  elemType = (e)->
    for type in ["item", "spo", "relation"]
      return type if e.hasClass type
  
  ig.debug "start"
  ig.database "informationgraph"

  ig.notification (text)->
    $("#notification").stop(true, true)
      .text(text)
      .fadeIn("fast").delay(3000).fadeOut("slow")

  #ig.setupLogin
    #loginData:  getLoginData()
    #-> $("#loginButton").text("Logout")
    #-> $("#loginButton").text("Login")

  ig.refresh (doc)->
    ### this is the document refresh handler for the app ###
    elems = findOnPage doc
    if onPage doc
      if doc._deleted
        elems.remove()
      else
        elems.each (i, e)->
          e = $ e
          template = $ "##{elemType(e)}Template"
          e.after template.tmpl doc
          e.remove()
          $.tmplItem(e).data = doc
    
  ig.docSelection(
    (doc, index)->
      selectText = ["-", "s", "p", "o"]
      elems = findOnPage doc
      elems.each (i, e)->
        e = $ e
        e.addClass "#{elemType(e)}Selected"
        e.find(".docSelect:last").find(".optionText")
          .text selectText[index]
    (doc)->
      unSelectText = "-"
      elems = findOnPage doc
      elems.each (i, e)->
        e = $ e
        e.removeClass "#{elemType(e)}Selected"
        ### 
          .docSelect:last because otherwise a relation's 
          subject's docSelect button might be chosen
        ###
        e.find(".docSelect:last").find(".optionText")
          .text unSelectText
  )

  ig.linkPlaceholder "#itemList",
    view:         "home/allItems"
    beforeRender: -> $("#itemList").empty()
    render:       (doc)-> render doc, "#itemList", "#itemTemplate"

  $("#itemFilter").change ->
    val = shortenItem $(this).val()
    if val
      ig.linkPlaceholder "#itemList",
        view:         "home/itemSuggestions"
        query:
          startkey:   val
          endkey:     val + "\u9999"
        beforeRender: -> $("#itemList").empty()
        render:       (doc)-> render doc, "#itemList", "#itemTemplate"
    else
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
      ### this line is needed for _changes to affect this new doc ###
      render doc, "#itemList", "#itemTemplate"
    false
  co.delegate ".docSelect", "click", ->
    e = docElem this
    id = e.attr "doc_id"
    ig.selectDoc id
    false
  co.delegate ".docDelete", "click", ->
    e = docElem this
    id = e.attr "doc_id"
    ig.deleteDoc id
    false
  co.delegate ".docSearch", "click", ->
    e = docElem this
    id = e.attr "doc_id"
    ig.linkPlaceholder "#queryRelationList",
      view:         "home/relations"
      query:
        startkey: [id]
        endkey:   [id, {}]
      beforeRender: -> $("#queryRelationList").empty()
      render:       (doc)->
        #al doc.getSubject().toString() if doc.type is "relation"
        render doc, "#queryRelationList", "#relationTemplate"
    false
  # NOTE: Docs are considered immutable
  #co.delegate ".itemValue", dblclick, ->
    #e = docElem this
    #id = e.attr "doc_id"
    #ig.doc id, (doc)->
      #p = e.parent()
      #e.after $("itemEditTemplate").tmpl doc
      #e.remove
      #findOnPage(doc, p).find("input:first").focus()
    #false
  #co.delegate ".itemEditForm", "submit", ->
    #e = docElem this
    #id = e.attr "doc_id"
    #input = $(this).find "input.itemInput"
    #val = shortenItem input.val(), onlyTrim: true
    #ig.editItem id, val
  #false
