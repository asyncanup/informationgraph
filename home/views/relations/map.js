(function(doc) {
  if (doc.type === "relation") {
    emit([doc.subject._id, "s"], null);
    emit([doc.predicate._id, "p"], null);
    return emit([doc.object._id, "o"], null);
  }
});