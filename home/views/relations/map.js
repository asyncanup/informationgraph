function(doc){
  if (doc.type === "relation"){
    // query the view with include_docs=true to get the relation docs
    // or just include the docs here if view response speed is a concern.
    emit ([doc.subject, "subject"], null); 
    emit ([doc.object, "object"], null);
  }
};
