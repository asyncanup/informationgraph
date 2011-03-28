function(doc){
  if(doc.type === "answer"){
    emit ([doc.query, doc.relation], doc.answer);
  }
}
