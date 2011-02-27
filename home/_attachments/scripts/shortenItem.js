function shortenItem(str, options){
  options = options || {};
  options.onlyTrim = options.onlyTrim || false;

  // trim and remove pointless whitespace
  // ISSUE: should we do this?
  // if options.onlyTrim is true, then the trimmed string directly returned without shortening it further
  str = str.trim().replace(/\s+/g, ' ');
  if (options.onlyTrim) return str;

  // remove all consecutive duplicates
  var lastChar = str.charAt(0);
  for (var i = 1; i < str.length; i += 1){
    if (str.charAt(i) === lastChar) {
      str = str.replace(lastChar, '');
      i -= 1;
    }
    lastChar = str.charAt(i);
  }

  // remove vowels and spaces
  str = str.replace(/[aeiou ]/g, ''); 

  return str;
}
