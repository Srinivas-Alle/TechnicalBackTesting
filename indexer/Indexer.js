const LineReaderSync = require('line-reader-sync');
const moment = require('moment');
const recursive = require('recursive-readdir-sync');
const elasticsearch = require('elasticsearch');
const BluebirdPromise = require('bluebird');

const client = new elasticsearch.Client({
  host: 'localhost:9200',
  apiVersion: '5.5',
});

const index = (stocks, esIndex) => {
  const body = [];
  stocks.forEach((doc) => {
    body.push({ index: { _index: esIndex } });
    body.push(doc);
  });

  return new BluebirdPromise((resolve, reject) => {
    client.bulk({ body }, (err, res) => {
      if (err) return reject(err);
      console.log('time taken to index: ', res.took);
      return resolve();
    });
  });
};

async function pushEachFile(file, filesArr) {
  console.log('processing file----', file);
  const stocks = [];
  const lrs = new LineReaderSync(file);
  const lines = lrs.toLines();

  lines.forEach((line) => {
    const info = line.split(',');
    // console.log(info, nifty50.indexOf(info[0]));

    const ohlc = {
      name: info[0],
      time: moment(`${info[1]} ${info[2]}`, 'YYYYMMDD hh:mm').format(),
      open: parseFloat(info[3]),
      high: parseFloat(info[4]),
      low: parseFloat(info[5]),
      close: parseFloat(info[6]),
      volume: parseFloat(info[7]),
    };
    stocks.push(ohlc);
  });
  await index(stocks, 'ticks_1min', 'default');
  console.log(filesArr.length);
  if (filesArr.length !== 0) {
    const file1 = filesArr.pop();
    pushEachFile(file1, filesArr);
  }
}
function readFilesAndPushToElastic() {
  const files = recursive('../data/ticks/NIFTY50_AUG2019');
  const file1 = files.pop();
  pushEachFile(file1, files);
}


readFilesAndPushToElastic();
