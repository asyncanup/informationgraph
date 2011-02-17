function(doc){
  if (doc.type === "relation"){
    emit ([doc.subject, "subject"], doc._id);
    emit ([doc.object, "object"], doc._id);
  }
};
