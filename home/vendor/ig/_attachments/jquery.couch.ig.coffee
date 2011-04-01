do (jQuery)->
  $ = jQuery
  ig = $.ig ?= {}

  db = null
  debugMode = on
  selectedSpo = []
  notifyUI = ->
  cache = new LRUCache 100
  hose = null
  listeners = {}

  defaultCallback = (whatever)-> l "defaultCallback: #{whatever}"
  refreshDoc = (whatever)-> l "default refreshDoc: #{doc}"
  guiDocSelect = (doc)-> l "default guiDocSelect: #{doc}"
  guiDocUnSelect = (doc)-> l "default guiDocUnSelect: #{doc}"
  l = (str)-> console.log "ig: #{val}" if window.console and debugMode
  timestamp = -> (new Date()).getTime()
  couchDoc = (doc)->
    d = $.extend {}, doc
    delete d.toString
    delete d.igSelectionIndex
    switch d.type
      when "item" then d
      when "relation"
        delete d.getSubject
        delete d.getPredicate
        delete d.getObject
        d
      when "answer"
        # TODO:
        d
      else
        d
  hashUp = (arg)->
    # TODO:

  couchError = (err)->
    (response)-> ig.notify "#{err}: #{response.reason}"

  ig.debug = (cmd)->
    if cmd?
      debugMode = if cmd is "stop" then off else on
      l "debug mode on"
      ig
    else
      debugMode

  ig.database = (dbname)->
    unless dbname?
      db
    else
      db = $.couch.db dbname
      l "db set to #{dbname}"
      hose = db.changes()
      hose.onChange (feed)->
        l "received changes"
        for d in feed.results
          if cache.find d.id
            if d.deleted
              cache.remove d.id
              l "#{d.id} deleted"
              ig.refresh
                _id: d.id
                _deleted: true
                toString: -> this._id
            else
              ig.doc(
                d.id
                (doc)->
                  l "#{doc} updated"
                  ig.refresh doc
                true
              )
      l "_changes feed set up"
      ig

  ig.doc = (id, callback, forceFetch)->
    throw "ig.doc needs id" unless id?
    throw "ig.doc needs a callback" unless callback?
    if not forceFetch and cache.find id
      callback cache.get id
    else
      db.openDoc id,
        success: (d)->
          d.igSelectionIndex = 0
          ### about whether this doc
          has been selected in GUI ###
          switch d.type
            when "item"
              d.toString = -> this.value
              cache.remove d._id
              cache.put d._id, d
              l "item loaded: #{d}"
              callback d
            when "relation"
              ig.doc d.subject, (subject)->
                ig.doc d.predicate, (predicate)->
                  ig.doc d.subject, (object)->
                    d.getSubject = ->
                      cache.get d.subject
                    d.getPredicate = ->
                      cache.get d.predicate
                    d.getObject = ->
                      cache.get d.object
                    d.toString = ->
                      "( #{this.getSubject()} - #{this.getPredicate()} - #{this.getObject()} )"
                    cache.remove d._id
                    cache.put d._id, d
                    l "relation loaded: #{d}"
                    callback d
            when "answer"
              l "answer loaded: #{d._id}"
              callback d
        error: couchError "could not open document: #{id}"

  ig.search = (view, query, callback, dontNotify)->
    # TODO: make it accept 2 callbacks, one for docs and one for no results case
    throw "search needs view" unless view?
    throw "search needs callback" unless callback?
    query ?= {}
    db.view view,
      $.extend query,
        success: (data)->
          unless dontNotify
            ig.notify "Search results: #{data.rows.length}"
            callback false if data.rows.length is 0
            for row in data.rows
              ig.doc row.id, (doc)->
                callback doc
        error: couchError "Could not run search query for #{view}"

  ig.notify = (text)-> l text
  ig.notification = (f)->
    throw "gui notification handler not specified" unless f?
    ig.notify = (text)->
      l text
      f text
    l "gui notification handler set up"
    ig

  ig.docSelection = (select, unselect)->
    throw "docSelection needs gui selection handler" unless select?
    throw "docSelection needs gui unselection handler" unless unselect?
    guiDocSelect = select
    guiDocUnSelect = unselect
    ig

  ig.refresh = (arg)->
    refreshPlaceholder = (placeholder)->
      unless listeners[placeholder]?
        l "refresh: #{placeholder} is not registered"
        false
      else
        options = listeners[placeholder]
        # TODO: remove these redundant vars
        [query, render, view] = [
          options.query
          options.render
          options.view
        ]
        l "refresh: refreshing #{placeholder}"
        options.beforeRender?()
        # TODO: use the noResults callback of ig.search
        ig.search view, query, (doc)->
          unless doc
            l "refresh: no results in #{view} query"
          else
            render doc
            if doc.igSelectionIndex
              guiDocSelect doc, doc.igSelectionIndex
            else
              guiDocUnSelect doc
            l "refresh: rendered #{doc}"
    switch typeof arg
      when "function"
        refreshDoc = arg
        l "refreshDoc set"
      when "string"
        l "refresh: #{arg}"
        refreshPlaceholder arg
      when "object" and arg.length? and arg.push?
        refreshPlaceholder p for p in arg
      when "object" and arg.type?
        l "refreshDoc: #{arg}"
        if arg.igSelectionIndex
          guiDocSelect arg, arg.igSelectionIndex
        else
          guiDocUnSelect arg
      else
        l "refresh: everything"
        refreshPlaceholder p for p of listeners
    ig

  ig.linkPlaceholder = (placeholder, options)->
      throw "linkPlaceholder needs placeholder" unless placeholder?
      throw "linkPlaceholder needs options" unless options?
      throw "linkPlaceholder needs options.render" unless options.render?
      throw "linkPlaceholder needs options.view" unless options.view?
      listeners[placeholder] = options
      l "linked #{placeholder} to #{options.view}"
      ig.refresh placeholder
      ig

  ig.unlinkPlaceholder = (placeholder)->
    delete listeners[placeholder]
    ig.refresh()
    ig
  ig.unlinkAll = ->
    listeners = {}
    l "cleared all placeholder listeners"
    ig

  ig.newItem = (val, whenSaved)->
    whenSaved ?= defaultCallback
    val = shortenItem val
      onlyTrim: true
    unless val
      ig.notify "Please enter a value"
      false
    else
      item =
        type: "item"
        value: val
        created: timestamp()
      db.saveDoc item,
        success: (data)->
          l "saved new item"
          ig.doc data.id, (doc)->
            ig.notify "Created: #{doc}"
            whenSaved doc
        error: couchError "Could not create item '#{val}'"

  ig.deleteDoc = (id, whenDeleted, forcingIt)->
    throw "deleteDoc needs id" unless id?
    whenDeleted ?= defaultCallback
    if not forcingIt
      ig.search "home/relations",
        startkey: [id]
        endkey:   [id, {}]
        limit:    1
        (doc)->
          if doc
            ig.notify "Delete dependent relations first: #{doc}"
            ig.doc id, (d)->
              refreshDoc d
          else
            ig.doc id, (d)->
              db.removeDoc d,
                success: (data)->
                  ig.notify "Deleted: #{d}"
                  whenDeleted d
                error: couchError "Could not delete #{d}"
    else
      #TODO: implement the forcingIt version

  ig.editItem = (id, newVal, whenEdited)->
    throw "editItem needs id" unless id?
    whenEdited ?= defaultCallback
    ig.doc id, (doc)->
      d = couchDoc doc
      d.value = newVal
      d.updated = timestamp()
      l "saving item with new value '#{d.value}'"
      db.saveDoc d,
        success: (data)->
          l "saved edited document, notifying app"
          ig.doc data.id, (item)->
            ig.notify "Edited: #{item}"
            whenEdited doc
        error: couchError "Could not edit #{doc}"

  ig.selectDoc = (id)->
      throw "selectDoc needs id" unless id?

      select = (doc)->
        selectedSpo.push doc
        doc.igSelectionIndex = selectedSpo.length
        l "selected: #{doc}"
        guiDocSelect doc, doc.igSelectionIndex
        makeRelation() if selectedSpo.length is 3

      unselect = (doc)->
        selectedSpo.pop()
        doc.igSelectionIndex = 0
        l "unselected: #{doc}"
        guiDocUnSelect doc

      makeRelation = ->
        l "subject, predicate and object selected, making relation"
        relation =
          type: "relation"
          subject: selectedSpo[0]._id
          predicate: selectedSpo[1]._id
          object: selectedSpo[2]._id
          created: timestamp()
        db.saveDoc relation,
          success: (data)->
            for spo in selectedSpo
              spo.igSelectionIndex = 0
              guiDocUnSelect spo
            selectedSpo = []
            ig.doc data.id, (relation)->
              ig.notify "Created: #{relation}"
              ig.saveAnswers relation, ->
                l "done saving answers"
          error: couchError "Could not make relation"

      ig.doc id, (doc)->
        if selectedSpo.length isnt 0
          if doc._id is selectedSpo[selectedSpo.length-1]._id
            unselect doc
          else if doc._id in (spo._id for spo in selectedSpo)
            ig.notify "Sorry, already selected that one"
          else if selectedSpo.length is 3
            ig.notify "Can't select more than 3"
          else
            select doc
      ig

  ig.saveAnswers = (relation, callback)->
    # TODO: do away with this
    answers = ig.makeAnswers relation
    l "saving answers to db"
    next 0
    
    next = (i)->
      db.saveDoc answers[i],
        success: (data)->
          l "saved: #{JSON.stringify answers[i].query}"
          if i < answers.length - 1 then next i+1 else callback()
        error: couchError JSON.stringify answers[i].query

  ig.makeAnswers = (relation)->
    prepare = (spo)->
      obj = $.extend {}, spo












