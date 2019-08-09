const fs = require("fs");
const elasticsearch = require("elasticsearch");
const lodash = require("lodash");
const BluebirdPromise = require("bluebird");
const moment = require("moment");
const calender = require("../utils/calender");
var talib = require("talib");
console.log(talib.version);

const client = new elasticsearch.Client({
  host: "localhost:9200",
  apiVersion: "5.5"
});

const getQuery = (date, params) => {
  return {
    query: {
      bool: {
        filter: [
          {
            range: {
              time: {
                gte: date,
                lt: moment(date)
                  .add(1, "days")
                  .format()
              }
            }
          },
          {
            script: {
              script: {
                inline:
                  "(doc['close'].value - doc['open'].value) > (params.width * (doc['high'].value - doc['close'].value)) ",
                lang: "painless",
                params: {
                  width: params.width
                }
              }
            }
          },
          {
            script: {
              script: {
                inline:
                  "(doc['close'].value - doc['open'].value) > (params.width * (doc['open'].value - doc['low'].value))",
                lang: "painless",
                params: {
                  width: params.width
                }
              }
            }
          },
          {
            script: {
              script: {
                inline:
                  "doc['volume'].value * doc['close'].value > " +
                  params.turnover,
                lang: "painless"
              }
            }
          },
          {
            script: {
              script: {
                inline:
                  "100 * (doc['close'].value - doc['open'].value) / doc['open'].value > " +
                  params.percentChange,
                lang: "painless"
              }
            }
          }
        ]
      }
    }
  };
};

const getClosePrice = (name, date) => {
  const query = {
    query: {
      bool: {
        filter: [
          {
            term: {
              "name.keyword": name
            }
          },
          {
            range: {
              time: {
                gte: date,
                lt: moment(date)
                  .add(1, "days")
                  .format()
              }
            }
          }
        ]
      }
    }
  };
  // console.log(name, date);
  return new BluebirdPromise((resolve, reject) => {
    client.search(
      {
        index: "scrips_all",
        type: "scrip",
        body: query
      },
      (err, res) => {
        if (err) console.log(err);
        if (res.hits.hits[0]) {
          resolve(res.hits.hits[0]._source);
        } else {
          resolve(null);
        }
      }
    );
  });
};

const round = num => {
  return Math.round(num * 100) / 100;
};

const run = (date, params) => {
  return new BluebirdPromise((resolve, reject) => {
    client.search(
      {
        index: "scrips_all",
        type: "scrip",
        body: getQuery(date, params)
      },
      (err, res) => {
        console.log("#################### " + date + " ###############");
        if (err) console.log(err);
        let totalPercentage = 0;
        const mapper = hit => {
          const date = moment(hit._source.time)
            .format()
            .split("T")[0];
          return getClosePrice(hit._source.name, calender.nextDate(date)).then(
            source => {
              if (!source) return;
              const nextClose = source.close;
              const buy = hit._source.close;
              const stoplossPercent = 20;
              const stoplossPrice = buy * (1 - stoplossPercent / 100);
              let percent;
              if (source.low < stoplossPrice) {
                percent = -1 * stoplossPercent;
              } else {
                percent =
                  Math.round((((nextClose - buy) * 100) / buy) * 100) / 100;
              }
              console.log(hit._source.name, buy, nextClose, percent);
              totalPercentage += percent;
            }
          );
        };
        BluebirdPromise.map(res.hits.hits, mapper, { concurrency: 1 }).then(
          () => {
            if (totalPercentage === 0) {
              return resolve(0);
            }
            const brokeragePercent = 0.21;
            // const brokeragePercent = 0.06;
            const effectivePercentage =
              round(totalPercentage / res.hits.hits.length) - brokeragePercent;
            console.log(totalPercentage, effectivePercentage);
            const principal = 100000;
            console.log("principal: ", principal);
            const profit = (principal * effectivePercentage) / 100;
            console.log("profit", profit);
            resolve(profit);
          }
        );
      }
    );
  });
};

var tradingDays = fs
  .readFileSync("../utils/trading-days.csv")
  .toString()
  .split("\n");
tradingDays = tradingDays.map(day => {
  console.log(day);
  return day.replace("\\r", "").trim();
});
console.log(tradingDays);

// run('2018-01-01');
let totalProfit = 0;
const iterate = i => {
  if (!i) i = 0;
  if (i === dates.length) return;
  run(dates[i], params).then(profit => {
    if (profit) {
      totalProfit += profit;
      console.log("totalProfit: ", totalProfit);
    }
    iterate(i + 1);
  });
};

const params = {
  width: 25,
  turnover: 5000000,
  percentChange: 2
};

const getDates = (fromDate, toDate) => {
  return tradingDays.filter(date => {
    return moment(fromDate) <= moment(date) && moment(toDate) >= moment(date);
  });
};

console.log(process.argv);
const fromDate = process.argv[2];
const toDate =
  process.argv[3] ||
  moment()
    .format()
    .split("T")[0];
const dates = getDates(fromDate, toDate);
console.log("dates: ", dates.length);
iterate();

// example command
// node bullish-marubozu.js 2018-01-01 2018-05-01

// 1cr == totalProfit:  8230
// 2cr == totalProfit:  6020
// 3cr = totalProfit:  6490
// 4cr == totalProfit:  3040
// 5cr == totalProfit:  10340
//10cr == -6040
//50cr == -2139

// params: width: 15, turnover 1cr 10000000, stoploss: 20
// 2015-06 37k
// 2016-01 1.53
// 2016-06 2.22
// 2017-01 3.37
// 2017-06 4.71
// 2017-12 6.68
// 2018-06 7.86

// below are for only 4 days in a week
//params: width: 15, turnover 50L => 8.72
//params: width: 20, turnover 50L => 10.31
// width: 25, turnover 50L => 10.88 Lakh (1088 percent!!!! over 3.5 years) => 1088940
// width: 25, turnover 50L, percentChange 2.5 => 11.45 Lakh
// width: 25, turnover 50L, percentChange 2 => 11.39 Lakh
// width: 25, turnover 50L, percentChange 1 => 11.07 Lakh
// width: 25, turnover 10L => 10.84 Lakh
// width: 25, turnover 1cr => 10.13 Lakh
// width: 50, turnover 1cr => 10.21 Lakh

// 5 days a week
// 2015-01-01, 1542970
// 2016-01-01, 1050030

// CNC long: enter at marubozu forming day around 3PM, exit at end of the next trading day
