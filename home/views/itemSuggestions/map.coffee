(doc)->
  `// !code _attachments/scripts/shortenItem.js
  `
  if doc.type is "item"
    str = shortenItem doc.value
    for i in [0...str.length]
      emit str.slice(i), null
