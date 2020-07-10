/* eslint-disable no-await-in-loop */
/* eslint-disable no-underscore-dangle */

const moment = require('moment');
const fs = require('fs');
const elasticUtil = require('../utils/elastic');
const zerodhaUtil = require('./zerodhaUtil');
const technicalUtil = require('../utils/technical');

const directoryPath = '/Users/srinivasalle/Desktop/workspace/za/TechnicalBackTesting/indexer/data_engine/zerodha_data';


const niftyQuotes = JSON.parse(fs.readFileSync('/Users/srinivasalle/Desktop/workspace/za/TechnicalBackTesting/indexer/data_engine/NSE_FUTURES_listed_EQ.json', 'utf8'));

const set = {};
niftyQuotes.forEach((quote) => {
  set[quote.name] = quote.instrument_token;
});


const getLast200Candles = (name, time) => ({
  size: 200,
  query: {
    bool: {
      must: [

        {
          match: {
            name,
          },
        },
        {
          range: {
            time: {

              lte: time,
            },
          },
        },


      ],
    },
  },
  sort: [
    {
      time: {
        order: 'desc',
      },
    },
  ],
});

const getQueryOfLastEntry = (name) => ({
  size: 1,
  query: {
    bool: {
      must: [
        {
          match: {
            name,
          },
        },
      ],
    },
  },
  sort: [
    {
      time: {
        order: 'desc',
      },
    },
  ],

});
const writeCandlesToFile = (candles, year, name, token, timeFrame) => new Promise((resolve) => {
  const filePath = `${directoryPath}/${timeFrame}/${year}/${name}_${token}.json`;
  const existingTicks = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const allTicks = existingTicks.concat(candles);
  fs.writeFileSync(filePath, JSON.stringify(allTicks));
  resolve();
});

const requestOHLCOf = async (name, instrumentToken, timeFrame, startTime, endTime) => {
  const candles = await zerodhaUtil.requestBySplittingTime(name, instrumentToken,
    timeFrame, startTime, endTime);
  await writeCandlesToFile(candles, new Date(startTime).getFullYear(),
    name, instrumentToken, timeFrame);
  return candles;
};

async function applyTechnicals(candles, name, instrumentToken, startTime, timeFrame) {
  let stockTicks = candles.map((tick) => ({
    name,
    instrument_token: instrumentToken,
    time: tick[0],
    open: tick[1],
    high: tick[2],
    low: tick[3],
    close: tick[4],
    volume: tick[5],
  }));
  // eslint-disable-next-line no-await-in-loop
  let last200Canelds = await elasticUtil.search(getLast200Candles(name, startTime), `ticks_${timeFrame}`);
  last200Canelds = last200Canelds.map((tick) => tick._source);
  last200Canelds = last200Canelds.reverse();
  stockTicks = last200Canelds.concat(stockTicks);
  stockTicks = await technicalUtil.applyEMAs(stockTicks);
  stockTicks = stockTicks.slice(200);
  return stockTicks;
}

async function indexAllTicksOfPeriod(timeFrame, tillDate) {
  for (let index = 0; index < niftyQuotes.length; index += 1) {
    const quote = niftyQuotes[index];

    // eslint-disable-next-line camelcase
    const { name, instrument_token } = quote;
    const reslutls = await elasticUtil.search(getQueryOfLastEntry(name), `ticks_${timeFrame}`);
    const { time } = reslutls[0]._source;
    let startTime;
    if (timeFrame === 'week') {
      startTime = moment(time).add(1, 'd').format('YYYY-MM-DD');
    } else {
      startTime = moment(time).add(6, 'd').format('YYYY-MM-DD');
    }


    if (moment(startTime).isAfter(moment.endTime)) throw new Error('invalid start & end times');

    const ohlcCandles = await requestOHLCOf(name, instrument_token, timeFrame, startTime, tillDate);
    const emaTicks = await applyTechnicals(ohlcCandles, name, instrument_token, startTime, timeFrame);
    await elasticUtil.index(emaTicks, `ticks_${timeFrame}`, 'default');
    console.log(`done for ${quote.name}`);
  }
}

const updateDataOfTimeFrame = async (timeFrame) => {
  const toDate = moment(new Date()).subtract(1, 'd').format('YYYY-MM-DD');
  await indexAllTicksOfPeriod(timeFrame, toDate);
};

// updateDataOfTimeFrame('week');
