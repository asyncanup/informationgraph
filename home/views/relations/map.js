function(doc){
  if (doc.type === "relation"){
    // think about adding doc.subject.value before doc.subject here
    emit ([doc.subject, "subject"], null); 
    emit ([doc.subject, "predicate"], null); 
    emit ([doc.object, "object"], null);
  }
};
