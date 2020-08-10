/* eslint-disable max-len */
/* eslint-disable no-use-before-define */
/* eslint-disable no-param-reassign */
const fs = require('fs');
const moment = require('moment');
const zerodhaUtil = require('./zerodhaUtil');

const direcotryPath = '/Users/srinivasalle/Desktop/workspace/za/TechnicalBackTesting/indexer/data_engine/zerodha_data';

const niftyQuotes = JSON.parse(fs.readFileSync('/Users/srinivasalle/Desktop/workspace/za/TechnicalBackTesting/indexer/data_engine/NSE_FUTURES_listed_EQ.json', 'utf8'));

const set = {};
niftyQuotes.forEach((quote) => {
  set[quote.name] = quote.instrument_token;
});

console.log('hello');


function writeTofile(startTime, timeFrame, tickName, candles) {
  const year = new Date(startTime).getFullYear();
  const dir = `${direcotryPath}/${timeFrame}/${year}/`;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  const name = `${tickName}_${set[tickName]}`;
  fs.writeFileSync(`${dir}/${name}.json`, JSON.stringify(candles));
  console.log('written to path ', name, timeFrame, year);
}

const writeWeeklyCandles = (startTime, timeFrame, tickName, candles, endTime) => {
  let yearCanedles = [];
  while ((moment(startTime).isBefore(endTime))) {
    const nextYearDate = moment(startTime).add(1, 'y');

    // eslint-disable-next-line no-loop-func
    yearCanedles = candles.filter((candle) => {
      if (moment(startTime).isSame(candle[0])) return true;
      if (moment(nextYearDate).isSame(candle[0])) return true;

      return moment(candle[0]).isBefore(nextYearDate) && moment(candle[0]).isAfter(startTime);
    });
    writeTofile(startTime, timeFrame, tickName, yearCanedles);
    startTime = nextYearDate;
  }
};


const requestOHLCOf = (tickName, instrumentToken, timeFrame, startTime, endTime) => new Promise((resolve) => {
  zerodhaUtil.requestBySplittingTime(tickName, instrumentToken, timeFrame, startTime, endTime).then((candles) => {
    try {
      if (timeFrame === 'week') {
        writeWeeklyCandles(startTime, timeFrame, tickName, candles, endTime);
      } else {
        writeTofile(startTime, timeFrame, tickName, candles);
      }
      resolve();
    } catch (err) {
      console.log(err);
      console.error(`Faield to fetch ${tickName}, start: ${startTime}, duration:${timeFrame}`);
    } finally {
      setTimeout(() => { resolve(); }, 50);
    }
  }).catch((err) => {
    console.log(err);
    resolve();
  });
});


// eslint-disable-next-line no-unused-vars
async function getQuotesOfPeriod(timeFrame, startTime, endTime) {
  for (let index = 0; index < niftyQuotes.length; index += 1) {
    const quote = niftyQuotes[index];
    // eslint-disable-next-line no-await-in-loop
    await requestOHLCOf(quote.name, quote.instrument_token, timeFrame, startTime, endTime);
    console.log(`done for ${quote.name}`);
  }
}
// getQuotesOfPeriod('hour', '2017-01-01', '2017-12-31');
// getQuotesOfPeriod('hour', '2018-01-01', '2018-12-31');
// getQuotesOfPeriod('hour', '2019-01-01', '2019-12-31');
// getQuotesOfPeriod('hour', '2020-01-01', '2020-07-21');
// getQuotesOfPeriod('10minute', '2016-01-01', '2016-12-31');
// getQuotesOfPeriod('10minute', '2017-01-01', '2017-12-31');
// getQuotesOfPeriod('10minute', '2018-01-01', '2018-12-31');
// getQuotesOfPeriod('10minute', '2019-01-01', '2019-12-31');
// getQuotesOfPeriod('10minute', '2020-01-01', '2020-06-08');

// getQuotesOfPeriod('week', '2020-01-01', '2020-07-06');
// getQuotesOfPeriod('5minute', '2020-01-01', '2020-06-08');
// getQuotesOfPeriod('30minute', '2020-01-01', '2020-05-29');
// getQuotesOfPeriod('5minute', '2017-01-01', '2017-12-31');
// getQuotesOfPeriod('5minute', '2016-01-01', '2016-12-31');
// getQuotesOfPeriod('5minute', '2020-01-01', '2020-12-31');
// getQuotesOfPeriod('60minute','2012-01-01','2012-12-31');
// getQuotesOfPeriod('30minute', '2016-01-01', '2016-12-31');
// getQuotesOfPeriod('30minute', '2017-07-01', '2017-12-31');
// getQuotesOfPeriod('30minute', '2018-07-01', '2018-12-31');
// getQuotesOfPeriod('30minute', '2019-07-01', '2019-12-31');
// getQuotesOfPeriod('30minute', '2020-07-01', '2020-12-31');
// getQuotesOfPeriod('60minute','2020-01-01','2020-12-31');
// getQuotesOfPeriod('60minute','2019-01-01','2019-12-31');
// getQuotesOfPeriod('60minute','2018-01-01','2018-12-31');
// getQuotesOfPeriod('60minute','2017-01-01','2017-12-31');
// getQuotesOfPeriod('60minute','2016-01-01','2016-12-31');
