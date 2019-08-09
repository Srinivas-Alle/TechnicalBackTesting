// const fs = require('fs');
// const es = require('event-stream');
//
// let lineNr = 0;
//
// const s = fs.createReadStream('../ohlc-06-22.csv')
//     .pipe(es.split())
//     .pipe(es.mapSync(function(line){
//
//             // pause the readstream
//             s.pause();
//
//             console.log(lineNr);
//             console.log(line);
//             lineNr += 1;
//
//             // process line here and call s.resume() when rdy
//             // function below was for logging memory usage
//
//             // resume the readstream, possibly from a callback
//             if (lineNr === 5) {
//                 s.resume();
//             }
//         })
//             .on('error', function(err){
//                 console.log('Error while reading file.', err);
//             })
//             .on('end', function(){
//                 console.log('Read entire file.')
//             })
//     );