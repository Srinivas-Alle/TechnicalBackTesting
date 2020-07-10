/* eslint-disable no-use-before-define */
/* eslint-disable no-continue */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-await-in-loop */
/**
 * Rules
 * 1. check in weekly stock rsi is above 40bundleRenderer.renderToStream
 * 2. weekly RSI should come from below 40 to above 40 over a period of time
 * 3. If weekly RSI take support on 40, that is also fine.
 * 4. RSI must be in uptrend i.e. should go from below 40 to above 40 and
 *  better it takes support and go again in towards 60
 * 5.When Weekly RSI is above 40, enter in day, when day RSI is above 60. on first candle
 * 6. Stop loss is low of they day candle. which we entered
 * 7. Target is 2R.
 */

const fs = require('fs');
const elasticUtil = require('../utils/elastic');


const getWeeklyTicks = (tick, starTime, endTime) => ({
  size:1000,
  query: {
    bool: {
      must: [
        {
          match: {
            name: tick.name,
          },
        },
        {
          range: {
            time: {
              gte: starTime,
              lte: endTime,
            },
          },
        },
      ],
    },
  },
});


const getAllFutureTicks = () => {
  const niftyQuotes = JSON.parse(fs.readFileSync('/Users/srinivasalle/Desktop/workspace/za/TechnicalBackTesting/indexer/data_engine/NSE_FUTURES_listed_EQ.json', 'utf8'));
  return niftyQuotes;
};


const getWeeklyRsiTurnedLowToSideways = async (fromDate, toDate) => {
  const niftyQuotes = getAllFutureTicks();
  for (let index = 0; index < niftyQuotes.length; index += 1) {
    const futureTick = niftyQuotes[index];
    let weeklyTicks = await elasticUtil.search(getWeeklyTicks(futureTick, fromDate, toDate), 'ticks_week');
    weeklyTicks = weeklyTicks.map((result) => result._source);
    const firstBouncedTick = getFirstBouncedTick(weeklyTicks);
    console.log("Log output: getWeeklyRsiTurnedLowToSideways -> firstBouncedTick", firstBouncedTick)
  }
};

const getFirstBouncedTick = (weeklyTicks) => {
  let foundLessThan35 = false;
  let weeklyTick;
  for (let index = 0; index < weeklyTicks.length; index += 1) {
    weeklyTick = weeklyTicks[index];

    if (weeklyTick.RSI14 < 35) {
      foundLessThan35 = true;
    }
    if (foundLessThan35 && weeklyTick.RSI14 > 45) {
      break;
    }
  }
  return weeklyTick;
};

const run = (params) => {
  getWeeklyRsiTurnedLowToSideways('2016-01-01','2020-06-08');
};
run();
// Get all tokens where weekly RSI 14
// Get where RSI < 35
//  Get wher RSI > 40 immediate next rsi
// when rsi crossed 45
// get day rsi..
// find when day rsi crosses above 60
// spot that first
