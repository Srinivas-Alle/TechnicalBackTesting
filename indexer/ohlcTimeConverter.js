const fs = require("fs");
const LineReaderSync = require("line-reader-sync");
const moment = require("moment");
var recursive = require("recursive-readdir-sync");
var ZIP_FILE = require("is-zip-file");
const StreamZip = require("node-stream-zip");
var tulind = require("tulind");
const elasticsearch = require("elasticsearch");
const lodash = require("lodash");
const BluebirdPromise = require("bluebird");
const eventStream = require("event-stream");

const client = new elasticsearch.Client({
  host: "localhost:9200",
  apiVersion: "5.5"
});

const nifty50 = [
  "ACC",
  "ADANIPORTS",
  "ASIANPAINT",
  "AXISBANK",
  "BAJAJ-AUTO",
  "BAJFINANCE",
  "BAJAJFINSV",
  "BPCL",
  "BHARTIARTL",
  "INFRATEL",
  "BRITANNIA",
  "CIPLA",
  "COALINDIA",
  "DRREDDY",
  "EICHERMOT",
  "GAIL",
  "GRASIM",
  "HCLTECH",
  "HDFCBANK",
  "HEROMOTOCO",
  "HINDALCO",
  "HINDUNILVR",
  "HDFC",
  "ICICIBANK",
  "ITC",
  "IBULHSGFIN",
  "IOC",
  "INDUSINDBK",
  "INFY",
  "JSWSTEEL",
  "KOTAKBANK",
  "LT",
  "M&M",
  "MARUTI",
  "NTPC",
  "ONGC",
  "POWERGRID",
  "RELIANCE",
  "SBIN",
  "SUNPHARMA",
  "TCS",
  "TATAMOTORS",
  "TATASTEEL",
  "TECHM",
  "TITAN",
  "UPL",
  "ULTRACEMCO",
  "VEDL",
  "WIPRO",
  "YESBANK",
  "ZEEL"
];

async function pushEachFile(file, filesArr) {
  console.log("processing file----", file);
  let stocks = [];
  lrs = new LineReaderSync(file);
  const lines = lrs.toLines();

  lines.forEach(line => {
    const info = line.split(",");
    // console.log(info, nifty50.indexOf(info[0]));
    if (true) {
      const ohlc = {
        name: info[0],
        time: moment(`${info[1]} ${info[2]}`, "YYYYMMDD hh:mm").format(),
        open: parseFloat(info[3]),
        high: parseFloat(info[4]),
        low: parseFloat(info[5]),
        close: parseFloat(info[6]),
        volume: parseFloat(info[7])
      };
      stocks.push(ohlc);
    }
  });
  await index(stocks, "ticks_1min", "default");
  console.log(filesArr.length);
  if (filesArr.length !== 0) {
    const file1 = filesArr.pop();
    pushEachFile(file1, filesArr);
  }
}
function readFilesAndPushToElastic() {
  const files = recursive("../data/ticks");
  const file1 = files.pop();
  pushEachFile(file1, files);
}

const index = (stocks, esIndex, esType) => {
  const body = [];
  stocks.forEach(doc => {
    body.push({ index: { _index: esIndex, _type: esType } });
    body.push(doc);
  });
  // console.log(body);
  // console.log(body);
  return new BluebirdPromise((resolve, reject) => {
    client.bulk({ body }, (err, res) => {
      if (err) return reject(err);
      console.log("time taken to index: ", res.took);
      resolve();
    });
  });
};

readFilesAndPushToElastic();
