function(doc){
  // !code _attachments/scripts/shortenItem.js

  if (doc.type === "item"){

    var str = shortenItem(doc.value);

    // emit keys
    for (i = 0; i < str.length; i += 1){
      emit(str.slice(i), null);
    }

  }
}
