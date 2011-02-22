var editmap = {
  "q": ["1", "a", "s", "w", "2"],
  "w": ["2", "q", "a", "s", "d", "e", "3"],
  "e": ["3", "w", "s", "d", "f", "r", "4"],
  "r": ["4", "e", "d", "f", "g", "t", "5"],
  "t": ["5", "r", "f", "g", "h", "y", "6"],
  "y": ["6", "t", "g", "h", "j", "u", "7"],
  "u": ["7", "y", "h", "j", "k", "i", "8"],
  "i": ["8", "u", "j", "k", "l", "o", "9"],
  "o": ["9", "i", "k", "l", "p", "0"],
  "p": ["0", "o", "l"],

  "m": []
}

function shortenItem(str){
  var i = 0,
  lastChar = str.charAt(0);

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

