(function(doc) {
  if (doc.type === "item") {
    return emit(doc.value, null);
  }
});