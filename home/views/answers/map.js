(function(doc) {
  if (doc.type === "answer") {
    return emit([doc.query, doc.relation], doc.answer);
  }
});