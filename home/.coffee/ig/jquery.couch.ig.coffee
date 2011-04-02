do (jQuery)->
  # TODO: 
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
  handleGuiSelection = (doc)->
    throw "handleGuiSelection needs doc" unless doc?
    if doc.igSelectionIndex
      guiDocSelect doc, doc.igSelectionIndex
    else
      guiDocUnSelect doc
    if doc.type is "relation"
      handleGuiSelection doc.getSubject()
      handleGuiSelection doc.getPredicate()
      handleGuiSelection doc.getObject()
  guiDocSelect = (doc)-> l "default guiDocSelect: #{doc}"
  guiDocUnSelect = (doc)-> l "default guiDocUnSelect: #{doc}"
  l = (str)-> window.console.log "ig: #{str}" if window.console and debugMode
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
        # TODO: decide on answer representation first
        d
      else
        d
  hashUp = (arg)->
    # TODO: hashUp all ids, no exceptions

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
              ### the deleted property is what couchdb 
                  sets in feed results. not mine ###
              doc = cache.get(d.id)
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
            handleGuiSelection doc
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
          handleGuiSelection arg
          ig.notify "#{arg} got deleted"
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
        else
          select doc
      ig

  ig.saveAnswers = (relation, callback)->
    # TODO: do away with this
    next = (i)->
      db.saveDoc answers[i],
        success: (data)->
          l "saved: #{JSON.stringify answers[i].query}"
          if i < answers.length - 1 then next i+1 else callback()
        error: couchError JSON.stringify answers[i].query

    answers = ig.makeAnswers relation
    l "saving answers to db"
    next 0
    
  ig.makeAnswers = (relation)->
    prepare = (spo)->
      obj = $.extend {}, spo
      obj.currentIndex = obj.nullIndex = -1
      obj.isNull = false
      if obj.type is "relation"
        obj[0] = prepare obj.getSubject()
        obj[1] = prepare obj.getPredicate()
        obj[2] = prepare obj.getObject()
        obj[0].up = obj[1].up = obj[2].up = obj
      obj

    newAnswer = (qArr, spo)->
      query:    qArr
      type:     "answer"
      relation: relation._id
      answer:   spo._id

    shiftNull = (r, answers)->
      if r is false
        ### meaning shiftNull was called on R.up (boundary condition) ###
        l "done making answers"
      else
        r.currentIndex = 0
        if r.nullIndex is -1
          r.nullIndex = 0
          r[0].isNull = true
          answers = triggerAnswer answers
          answers = more r, answers
        else if r.nullIndex < 2
          r[r.nullIndex].isNull = false
          r.nullIndex += 1
          r[r.nullIndex].isNull = true
          answers = triggerAnswer answers
          answers = more r, answers
        else if r.nullIndex is 2
          r[r.nullIndex].isNull = false
          r.nullIndex = -1
          answers = shiftNull r.up, answers
      answers

    triggerAnswer = (answers)->
      qArr = ig.queryArr R
      l "#{R[R.nullIndex]} answers #{JSON.stringify qArr}"
      answers.push newAnswer qArr, R[R.nullIndex]
      answers

    more = (r, answers)->
      if r.nullIndex is -1
        answers = shiftNull r, answers
      else if r.currentIndex is r.nullIndex
        r.currentIndex += 1
        answers = more r, answers
      else if r.currentIndex is 3
        answers = shiftNull r, answers
      else if r[r.currentIndex].type is "item"
        r.currentIndex += 1
        answers = more r, answers
      else if r[r.currentIndex].type is "relation"
        answers = more r[r.currentIndex], answers
      answers
  
    R = prepare relation
    R.up = false
    more R, []

  ig.queryArr = (r)->
    if r.isNull
      null
    else if r.type is "item"
      r.toString()
    else if r.type is "relation"
      return  (ig.queryArr r[n] for n in [0,1,2])

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


