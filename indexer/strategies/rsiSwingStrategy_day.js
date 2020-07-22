/* eslint-disable no-param-reassign */
/* eslint-disable no-use-before-define */
/* eslint-disable no-continue */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-await-in-loop */
/**
 * Rules
 * 1. check in daily rsi cross 60
 * 2. check supertrend should be green
 * 3. check stock must be come from 40 to 60 previous.
 * 4. price should be above ema 20
 * 5. enter with that & hold till price breaches super trend.
 */

const fs = require('fs');
const elasticUtil = require('../utils/elastic');


const getDailyTicks = (tick, starTime, endTime) => ({
  size: 1000,
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


const getDailyTicksTurnedPoistive = async (fromDate, toDate) => {
  const map = { count: 0 };
  const niftyQuotes = getAllFutureTicks();
  for (let index = 0; index < niftyQuotes.length; index += 1) {
    const futureTick = niftyQuotes[index];
    let dailyTicks = await elasticUtil.search(getDailyTicks(futureTick, fromDate, toDate), 'ticks_day');
    dailyTicks = dailyTicks.map((result) => result._source);
    const firstBouncedTick = getAllBouncedTicks(dailyTicks, map);
    // console.table(firstBouncedTick);
    // map[fir]
  }
  console.table(map);
};

const getAllBouncedTicks = (dailyTicks, map) => {
  let foundLessThan35 = false;
  let dailyTick;
  for (let index = 0; index < dailyTicks.length; index += 1) {
    dailyTick = dailyTicks[index];

    if (dailyTick.RSI14 < 45) {
      foundLessThan35 = true;
    }
    if (foundLessThan35 && dailyTick.RSI14 > 55) {
      let time = new Date(dailyTick.time);
      time = `${time.getFullYear()}-${time.getMonth() + 1}-${time.getDate()}`;
      if (map[dailyTick.name]) {
        const arr = map[dailyTick.name];
        arr.push({
          time,
          RSI14: dailyTick.RSI14,
        });
        map[dailyTick.name] = arr;
      } else {
        map[dailyTick.name] = [{
          time,
          RSI14: dailyTick.RSI14,
        }];
      }
      map.count += 1;
      foundLessThan35 = false;
    }
  }
  return dailyTick;
};

const run = (params) => {
  getDailyTicksTurnedPoistive('2020-06-01', '2020-12-31');
};
run();
// Get all tokens where weekly RSI 14
// Get where RSI < 35
//  Get wher RSI > 40 immediate next rsi
// when rsi crossed 45
// get day rsi..
// find when day rsi crosses above 60
// spot that first
