  # TODO:
  #
  # * Add a `two_way`: `true`/`false` attribute to relations
  # * Possibly emit `answers` queries as complex keys, so that when no results 
  #   are found for a query, it can be generalised and run again.
do (jQuery)->
  $ = jQuery
  ig = $.ig ?= {}

  db = null
  debugMode = on
  selectedSpo = []
  notifyUI = ->
  cache =
    find:   (id)-> this[id]?
    get:    (id)-> this[id]
    remove: (id)-> delete this[id]
    put:    (id, doc)-> this[id] = doc
  hose = null
  listeners = {}

  defaultCallback = (whatever)-> l "defaultCallback: #{whatever}"
  refreshDoc = (whatever)-> l "default refreshDoc: #{doc}"
  selectionIndex = {}
  guiDocSelect = (doc)-> l "default guiDocSelect: #{doc}"
  guiDocUnSelect = (doc)-> l "default guiDocUnSelect: #{doc}"
  l = (str)-> window.console.log "ig: #{str}" if window.console and debugMode
  timestamp = -> (new Date()).getTime()
  prepare = (doc)->
    ### Makes a doc returned by db.openDoc apt for ig's consumption 
        (putting into cache, letting it be selected, etc)
    ###
    selectionIndex[doc._id] = 0
    setupSpo = (spo)->
      switch spo.type
        when "item"
          spo.toString = -> this.value
        when "relation"
          spo.getSubject = -> doc.docs[this.subject]
          spo.getPredicate = -> doc.docs[this.predicate]
          spo.getObject = -> doc.docs[this.object]
          spo.toString = ->
            "( #{this.getSubject()} - #{this.getPredicate()} - #{this.getObject()} )"
    setupSpo doc
    if doc.type is "relation"
      $.each doc.docs, (id,d)->
        setupSpo d
    doc

  couchError = (err)->
    (response, id, reason)-> ig.notify "#{err}: #{reason}"

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
              ### the deleted property is what couchdb 
                  sets in feed results. not mine ###
              doc = cache.get d.id
              l "#{doc} deleted"
              doc._deleted = true
              ig.refresh doc
              cache.remove doc.id
            else
              ig.doc d.id,
                (doc)->
                  l "#{doc} updated"
                  ig.refresh doc
                true
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
          if d.type in ["item", "relation"]
            prepare d
            cache.remove d._id
            cache.put d._id, d
            l "#{d.type} fetched: #{d}"
            callback d
        error: couchError "could not open document: #{id}"

  ig.handleGuiSelection = (doc)->
    throw "ig.handleGuiSelection needs doc" unless doc?
    if selectionIndex[doc._id]
      guiDocSelect doc, selectionIndex[doc._id]
    else
      guiDocUnSelect doc
    if doc.type is "relation"
      ig.handleGuiSelection doc.getSubject()
      ig.handleGuiSelection doc.getPredicate()
      ig.handleGuiSelection doc.getObject()

  ig.search = (view, query, resultDocCallback, noResultsCallback, dontNotify)->
    throw "search needs view" unless view?
    throw "search needs resultDocCallback" unless noResultsCallback?
    query ?= {}
    db.view view,
      $.extend query,
        success: (data)->
          ig.notify "Search results: #{data.rows.length}" unless dontNotify
          if data.rows.length is 0
            noResultsCallback?()
          else
            for row in data.rows
              ig.doc row.id, (doc)->
                resultDocCallback doc
        error: couchError "Could not run search query for #{view}"

  ig.notify = (text)-> l text
  ig.notification = (f)->
    throw "gui notification handler not specified" unless f?
    ig.notify = (text)->
      l "notify: #{text}"
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
        l "refresh: refreshing #{placeholder}"
        options.beforeRender?()
        ig.search options.view, options.query,
          (doc)->
            options.render doc
            ig.handleGuiSelection doc
            l "refresh: rendered #{doc}"
          -> l "refresh: no results for the #{options.view} query in #{placeholder}"

    switch typeof arg
      when "function"
        refreshDoc = arg
        l "refreshDoc set"
      when "string"
        l "refresh: #{arg}"
        refreshPlaceholder arg
      when "object"
        if arg.length? and arg.push?
          refreshPlaceholder p for p in arg
        else if arg._deleted or arg.type?
          l "refreshDoc: #{arg}"
          refreshDoc arg
          ig.handleGuiSelection arg
          ig.notify "#{arg} got deleted" if arg._deleted
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
    val = shortenItem val,
      onlyTrim: true
    unless val
      ig.notify "Please enter a value"
      false
    else
      ig.search "home/allItems",
        key: val
        limit: 1
        (doc)-> ig.notify "'#{val}' already exists"
        ->
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
    removeNow = (id)->
      ig.doc id, (doc)->
        db.removeDoc doc,
          success: (data)->
            ig.notify "Deleted: #{doc}"
            whenDeleted doc
          error: couchError "Could not delete #{doc}"

    if forcingIt
      removeNow id
    else
      ig.search "home/relations",
        startkey: [id]
        endkey:   [id, {}]
        limit:    1
        (doc)->
          ig.notify "Delete dependent relations first: #{doc}"
          ig.doc id, (d)->
            refreshDoc d
        -> removeNow id

  ig.editItem = (id, newVal)->
    throw "editItem needs id" unless id?
    whenEdited ?= defaultCallback
    ig.doc id, (doc)->
      d = $.extend {}, doc
      d.value = newVal
      d.updated = timestamp()
      l "saving item with new value '#{d.value}'"
      db.saveDoc d,
        success: (data)->
          l "saved edited document, notifying app"
          ig.notify "Edited: #{doc}"
        error: couchError "Could not edit #{doc}"

  ig.selectDoc = (id)->
      throw "selectDoc needs id" unless id?

      select = (doc)->
        selectedSpo.push doc
        selectionIndex[doc._id] = selectedSpo.length
        l "selected: #{doc}"
        guiDocSelect doc, selectionIndex[doc._id]
        makeRelation() if selectedSpo.length is 3

      unselect = (doc)->
        selectedSpo.pop()
        selectionIndex[doc._id] = 0
        l "unselected: #{doc}"
        guiDocUnSelect doc

      makeRelation = ->
        l "subject, predicate and object selected, making relation"
        spo = [s, p, o] = ($.extend {}, x for x in selectedSpo)
        relation =
          type: "relation"
          subject: s._id
          predicate: p._id
          object: o._id
          docs: {}
          created: timestamp()
        for x in spo
          $.extend relation.docs, x.docs if x.type is "relation"
          delete x.docs
          relation.docs[x._id] = x
        db.saveDoc relation,
          success: (data)->
            for spo in selectedSpo
              selectionIndex[spo._id] = 0
              guiDocUnSelect spo
            selectedSpo = []
            ig.doc data.id, (relation)->
              ig.notify "Created: #{relation}"
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
        else
          select doc
      ig

  ig.setupLogin = (loginOptions, loggedIn, loggedOut)->
    throw "setupLogin needs login handler" unless loggedIn?
    throw "setupLogin needs logout handler" unless loggedOut?
    loginOptions ?= {}
    loginData ?=
      name: "_"
      password: "_"
    login = ->
      l "Logging in"
      $.couch.login $.extend loginData,
        success: loggedIn
        error: couchError "Could not login"
    logout = ->
      l "Logging out"
      $.couch.logout
        success: loggedOut
        error: couchError "Could not logout"

    loginElem = null
    # ISSUE: not ok with handling a dom element here
    $.couch.session
      success: (response)->
        if response.userCtx.roles.length is 0
          l "useCtx.roles is empty"
          loginElem = loggedOut()
          loginElem.toggle login, logout
        else
            l "userCtx.roles is non-empty"
            loginElem = loggedIn()
            loginElem.toggle logout, login
      error: couchError "Could not connect to database"
    ig

  ig.emptyDb = ->
    db.allDocs
      include_docs: true
      success: (data)->
        for row in data.rows
          db.removeDoc row.doc unless row.id.substr(0, 8) is "_design/"
      error: couchError "Could not empty the database"


