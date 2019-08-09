const fs = require("fs");
const elasticsearch = require("elasticsearch");
const lodash = require("lodash");
const BluebirdPromise = require("bluebird");
const eventStream = require("event-stream");

const client = new elasticsearch.Client({
  host: "localhost:9200",
  apiVersion: "5.5"
});

const index = (lines, esIndex, esType) => {
  let docs = lines.map(line => {
    const arr = line.split(",");
    return {
      name: arr[0],
      time: arr[1],
      open: parseFloat(arr[2]),
      high: parseFloat(arr[3]),
      low: parseFloat(arr[4]),
      close: parseFloat(arr[5]),
      volume: parseFloat(arr[6])
    };
  });

  const body = [];
  docs.forEach(doc => {
    body.push({ index: { _index: esIndex, _type: esType } });
    body.push(doc);
  });
  // console.log(body);
  return new BluebirdPromise((resolve, reject) => {
    client.bulk({ body }, (err, res) => {
      if (err) return reject(err);
      console.log("time taken to index: ", res.took);
      resolve();
    });
  });
};

const getChunks = fileName => {
  let ohlcData = fs
    .readFileSync(fileName)
    .toString()
    .split("\n");
  console.log(ohlcData.length);
  ohlcData = ohlcData.filter(entry => {
    return entry.length > 0;
  });
  console.log(ohlcData.length);

  const scrips = ohlcData.map(line => {
    const arr = line.split(",");
    return {
      name: arr[0],
      time: arr[1],
      open: parseFloat(arr[2]),
      high: parseFloat(arr[3]),
      low: parseFloat(arr[4]),
      close: parseFloat(arr[5]),
      volume: parseFloat(arr[6])
    };
  });

  return lodash.chunk(scrips, 5000);
};

const run = (fileName, esIndex, esType) => {
  let chunk = 0;
  let lines = [];
  let lineNr = 0;
  let lineNrNonEmpty = 0;
  const s = fs
    .createReadStream(fileName)
    .pipe(eventStream.split())
    .pipe(
      eventStream
        .mapSync(function(line) {
          // pause the readstream
          // s.pause();

          lineNr++;
          // console.log('line number: ', lineNr);
          if (line.length > 0) {
            lines.push(line);
            lineNrNonEmpty++;
          }
          if (lines.length === 5000) {
            console.log("chunk prepared: ", chunk);
            // chunk++;
            // lines = [];
            s.pause();
            return index(lines, esIndex, esType).then(() => {
              console.log("indexed chunk: ", chunk);
              chunk++;
              lines = [];
              s.resume();
            });
          }

          // s.resume();
        })
        .on("error", function(err) {
          console.log("Error while reading file.", err);
        })
        .on("end", function() {
          index(lines, esIndex, esType).then(() => {
            console.log("indexed chunk: ", chunk);
            chunk++;
            lines = [];
          });
          console.log(lineNr);
          console.log(lineNrNonEmpty);
          console.log("Read entire file.");
        })
    );

  // BluebirdPromise.map(getChunks(fileName), (docs) => { index(docs, esIndex, esType) }, { concurrency: 1 });
};

console.log(process.argv);
const fileName = process.argv[2];
const esIndex = process.argv[3] || "scrips_all";
const esType = process.argv[4] || "_doc";
run(fileName, esIndex, esType);

// example command:
// node indexer.js ohlc.csv scrips scrip
