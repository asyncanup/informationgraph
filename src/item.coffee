exports.shorten = (str, options)->
  options ?= {}
  throw "shortenItem needs str" unless str?
  str = str.trim().replace /\s+/g, ' '
  if options.onlyTrim
    str
  else
    i = 1
    lastChar = str.charAt 0
    l = str.length
    while i < l
      if str.charAt(i) is lastChar
        str = str.substr(0, i) + str.slice(i).replace lastChar, ''
        i -= 1
        l -= 1
      lastChar = str.charAt i
      i += 1

    str = str.replace /[aeiou ]/g, ''
    str
