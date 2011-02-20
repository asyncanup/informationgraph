function(doc){
  if (doc.type === "relation"){
    emit ([doc.subject, "subject"], {"_id": doc._id});
    emit ([doc.object, "object"], {"_id": doc._id});
  }
};
