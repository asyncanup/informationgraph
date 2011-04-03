(function(doc) {
  if (doc.type === "relation") {
    emit([doc.subject, "s"], null);
    emit([doc.predicate, "p"], null);
    return emit([doc.object, "o"], null);
  }
});