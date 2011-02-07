db.save('/_design/render', {
  language: "javascript",
  views: {
    everything: {
      map: function(doc) { 
          emit (doc._id, doc); 
      }
    }
  }
});
// save design document


var cradle = require('cradle');
var sys = require('sys');
var stdin = process.openStdin();
var db = new(cradle.Connection)('http://127.0.0.1', 5984, {
    cache: true, raw: false
    }).database('informationgraph');
//setup

db.view('render/everything', function(err, res) {
  res.forEach(function(err, row) {
    console.log(row._id);
  });
});
// query view


db.save("no",
    {
      test: "successful"
    },
    function(err, res){
      if (!err) {console.log("new item saved. id: " + res._id);}
    });
// save new doc

process.stdout.write("Delete all? ");
stdin.setEncoding('utf-8');
stdin.on("data", 
    function(choice){
      if (choice==="y") {

        db.view('render/everything',
          function(er, res) {
            res.forEach(
              function (err, row){
                db.remove(row._id, row._rev, 
                  function(eerr, ress){
                    if (eerr) {console.log("Could not delete: "+ JSON.stringify(row);)}
                    else {console.log("Deleted: "+JSON.stringify(row));}
                  });
              });
          });

      }
    });
stdin.on("SIGINT", function(){
  console.log("Ended.");
});

// Delete all documents in render/everything
