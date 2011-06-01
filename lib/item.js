exports.shorten = function(str, options) {
  var i, l, lastChar;
  options != null ? options : options = {};
  if (str == null) {
    throw "shortenItem needs str";
  }
  str = str.trim().replace(/\s+/g, ' ');
  if (options.onlyTrim) {
    return str;
  } else {
    i = 1;
    lastChar = str.charAt(0);
    l = str.length;
    while (i < l) {
      if (str.charAt(i) === lastChar) {
        str = str.substr(0, i) + str.slice(i).replace(lastChar, '');
        i -= 1;
        l -= 1;
      }
      lastChar = str.charAt(i);
      i += 1;
    }
    str = str.replace(/[aeiou ]/g, '');
    return str;
  }
};