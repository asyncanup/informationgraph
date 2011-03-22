function(doc){
  if (doc.type === "relation"){
    // think about adding doc.subject.value before doc.subject here
    emit ([doc.subject, "s"], null); 
    emit ([doc.predicate, "p"], null); 
    emit ([doc.object, "o"], null);
  }
};
