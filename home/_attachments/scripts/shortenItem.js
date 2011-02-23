function shortenItem(str){
  var i = 0;
  var lastChar = str.charAt(0);

  // remove all consecutive duplicates
  for (i = 1; i < str.length; i += 1){
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
