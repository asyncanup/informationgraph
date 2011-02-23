function(doc){

  if (doc.type === "item"){
    // !code _attachments/scripts/shortenItem.js

    var str = shortenItem(doc.value);

    // emit keys
    for (i = 0; i < (str.length - 2); i += 1){
      emit(str.slice(i), null);
    }

  }
}
