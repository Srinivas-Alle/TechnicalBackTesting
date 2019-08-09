const fs = require("fs");
const elasticsearch = require("elasticsearch");
const lodash = require("lodash");
const BluebirdPromise = require("bluebird");
const moment = require("moment");

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
                  "(doc['open'].value - doc['close'].value) > (params.width * (doc['high'].value - doc['open'].value)) ",
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
                  "(doc['open'].value - doc['close'].value) > (params.width * (doc['close'].value - doc['low'].value))",
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
                  "doc['volume'].value * doc['open'].value > " +
                  params.turnover,
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
          return getClosePrice(
            hit._source.name,
            moment(hit._source.time)
              .add(1, "days")
              .format()
          ).then(source => {
            if (!source) return;
            const buy = source.close;
            const sell = source.open;
            let percent;
            percent = Math.round((((sell - buy) * 100) / buy) * 100) / 100;
            console.log(hit._source.name, buy, sell, percent);
            totalPercentage += percent;
          });
        };
        BluebirdPromise.map(res.hits.hits, mapper, { concurrency: 1 }).then(
          () => {
            if (totalPercentage === 0) {
              return resolve(0);
            }
            // const brokeragePercent = 0.21;
            const brokeragePercent = 0.06;
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

const generateDates = () => {
  // const startDate = '2018-01-01';
  const startDate = "2015-01-05";
  const dates = [];
  const todayDate = moment()
    .format()
    .split("T")[0];
  let currDate = startDate;
  while (moment(currDate) < moment(todayDate)) {
    // while (moment(currDate) < moment('2018-01-01')) {
    dates.push(currDate); // mon
    dates.push(
      moment(currDate)
        .add(1, "days")
        .format()
        .split("T")[0]
    ); // tues
    dates.push(
      moment(currDate)
        .add(2, "days")
        .format()
        .split("T")[0]
    ); // wed
    dates.push(
      moment(currDate)
        .add(3, "days")
        .format()
        .split("T")[0]
    ); // thurs
    currDate = moment(currDate)
      .add(7, "days")
      .format()
      .split("T")[0];
  }
  // console.log(dates);
  return dates;
};

let dates = generateDates();
const holidays = [
  "2018-01-25",
  "2018-02-12",
  "2018-02-15",
  "2018-03-01",
  "2018-03-28",
  "2018-04-30",
  "2018-06-19",
  "2018-06-20",
  "2018-06-21"
];
// const holidays = [];
dates = lodash.difference(dates, holidays);

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
  width: 15,
  turnover: 1000000
};

iterate();

// width: 25, turnover 50L => 42k (over 3.5 years) this is not at all a good strategy

// MIS short: enter at next day of marubozu forming day around 9:15AM, exit at end of the same trading day 3PM
