/* eslint-disable camelcase */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-param-reassign */
// 1. Yesterday volume should be greater than yesterday 20day sma * 2
// 2. yesterday close should be greater then day b4 yesterday close
// 3. Today 10 min close should be greater then yesterday close
// 4. Today 10 min close greater than 10mins close
// 5. Stock should close above in supertrend(10,3),supertrend(9,2),supertrend(14,3) in 10mins
// 6. Remove upper wicks in bullish --> criteria upperwick > lowerwick && upperwick > body
// 7. If opening volume is huge, 5*avg 50 candles. skip.


// // 2. Stock should trade above stock 14,3
const moment = require('moment');
const fs = require('fs');
const elastic = require('../utils/elastic');
const superTrend = require('../utils/superTrend');


const niftyQuotes = JSON.parse(fs.readFileSync('/Users/srinivasalle/Desktop/workspace/za/TechnicalBackTesting/indexer/data_engine/NSE_FUTURES_listed_EQ.json', 'utf8'));


const voluemQuery = (tick) => ({
  query: {
    bool: {
      must: [
        {
          match: {
            name: tick.name,
          },

        }, {
          range: {
            time: {
              lte: tick.time,
              gte: moment(tick.time).subtract('1', 'month').format('YYYY-MM-DD'),

            },
          },
        },
      ],
    },

  },
  aggs: {
    avg_volume: {
      avg: {
        field: 'volume',
      },
    },
  },
});
const tickQuery = (tick) => (
  {
    query: {
      bool: {
        must: [
          {
            match: {
              name: tick.name,
            },
          },
          {
            match: {
              time: tick.time,
            },
          },
        ],
      },
    },
  }
);

const getPevDayTick = async (tick) => {
  const query = {


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

                lt: tick.time,
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


  };
  const dayResultTick = await elastic.search(query, 'ticks_day');
  const dayTick = dayResultTick[0]._source;
  return dayTick;
};

const isVoluemeMatched = async (tick, dayTick) => {
  const query = voluemQuery(tick);
  const results = await elastic.getAggregation(query, 'ticks_day');
  const volume = results.aggregations.avg_volume.value;

  if (dayTick.volume < 2 * volume) {
    return false;
  }
  return true;
};
const isTickClosedBullish = async (dayTick) => {
  const prevDayTick = await getPevDayTick(dayTick);

  if (dayTick.open > dayTick.close) return false;
  if (dayTick.close < prevDayTick.close) return false;
  return true;
};

const get10MinTick = async (dayTick) => {
  const { time } = dayTick;
  const format = moment(time).format('YYYY-MM-DD');
  const query = {
    size: 1,
    query: {
      bool: {
        must: [
          {
            match: {
              name: dayTick.name,
            },
          },
          {
            range: {
              time: {
                gt: `${format}T15:25:00+0530`,

              },
            },
          },
        ],
      },

    },
  };
  const minute10Tick = await elastic.search(query, 'ticks_10minute');
  if (!minute10Tick || minute10Tick.length === 0) return false;
  const min10Tick = minute10Tick[0]._source;
  return min10Tick;
};
const getSuperTrends = async (tick) => {
  const time = (moment(moment(tick.time).format('YYYY-MM-DD')).subtract('1', 'months')).format('YYYY-MM-DD');
  const query = {
    size: 5000,
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
                gte: time,

              },
            },
          },
        ],
      },
    },

  };
  const result = await elastic.search(query, 'ticks_10minute');
  let spAdded;
  let OHLCCandles;
  try {
    OHLCCandles = result.map((candle) => candle._source);

    spAdded = await superTrend.getSuperTrend(OHLCCandles, 9, 2);
    spAdded = await superTrend.getSuperTrend(spAdded, 10, 3);
    spAdded = await superTrend.getSuperTrend(spAdded, 14, 3);
    // console.log(JSON.stringify(spAdded));
    spAdded.forEach((spTick) => {
      // tick.time = moment(tick.time).format('YY-MM-DD hh:mm');
      delete spTick.ema20;
      delete spTick.ema100;
      delete spTick.ema200;
      delete spTick.ema150;
      // delete spTick.high;
      // delete spTick.low;
      // delete tick.RSI14;
      delete spTick.finalLowerBand;
      delete spTick.finalUpperBand;
      // delete spTick.volume;
      delete spTick.instrument_token;
    });
    return spAdded;
  } catch (error) {
    console.log(error);
  }
};
const hasLongerUpperWicks = (min10Tick) => {
  const {
    open, high, close, low,
  } = min10Tick;

  return ((high - close) > (close - open)) && ((open - low) < (high - close));
};
const is10MinCloseAbovePrevClose = (dayTick, min10Tick) => {
  const {
    open, high, close, averageTrueRange,
  } = min10Tick;
  // if ((close - open) > 2 * averageTrueRange) return false;
  if (hasLongerUpperWicks(min10Tick)) return false;
  return dayTick.close < min10Tick.close;
};
const is10MinVolumeisHuge = async (min10Tick) => {
  const query = voluemQuery(min10Tick);
  query.query.bool.must[1].range.time.gte = moment(moment(min10Tick.time).subtract(4, 'days')).format('YYYY-MM-DD');
  const results = await elastic.getAggregation(query, 'ticks_10minute');
  const volume = results.aggregations.avg_volume.value;
  return min10Tick.volume > 6 * volume;
};

const isEntry10MinAboveSP = async (dayTick) => {
  // return true;
// dayTick comewith yesterday filter
// Today morning session do they clsoed above SP?
  const dayTickTradingDay = moment(dayTick.time).format('YYYY-MM-DD');
  const nextDay = moment(moment(dayTickTradingDay).add(1, 'day')).format('YYYY-MM-DD');
  const min10tick = await get10MinTick(dayTick);
  const spAdded = await getSuperTrends(min10tick);

  const entryMinute10Tick = spAdded.filter((spTick) => !moment(spTick.time).isBefore(nextDay));
  // console.log(entryMinute10Tick[0]);
  const {
    close, superTrend9_2, superTrend10_3, superTrend14_3, open,
  } = entryMinute10Tick[0];
  // console.log('Log output: isEntry10MinAboveSP -> entryMinute10Tick', entryMinute10Tick[0]);
  if (open > close) return false;
  if (!is10MinCloseAbovePrevClose(dayTick, entryMinute10Tick[0])) return false;
  if (await is10MinVolumeisHuge(entryMinute10Tick[0])) {
    // console.log('fitleredout for huge volume', entryMinute10Tick[0]);
    return false;
  }
  return (close > superTrend9_2 && close > superTrend10_3 && close > superTrend14_3);
  // return true;
};
const isBullishIntra = async (tick, dayTick) => {
  if (!await isVoluemeMatched(tick, dayTick)) return false;
  if (!await isTickClosedBullish(dayTick)) return false;
  // return true;
  if (!await isEntry10MinAboveSP(dayTick)) return false;
  return true;
};

const isMatchedDayCriteria = async (tick) => {
  const dayResultTick = await elastic.search(tickQuery(tick), 'ticks_day');
  if (!dayResultTick || dayResultTick.length === 0) return false;
  const dayTick = dayResultTick[0]._source;
  if (await isBullishIntra(tick, dayTick)) {
    return dayTick;
  }
  return false;
};


async function run(start, end) {
  while (moment(start).isBefore(moment(end))) {
    const matchedTicks = [];
    for (let i = 0; i < niftyQuotes.length; i += 1) {
      const matched = await isMatchedDayCriteria({
        name: niftyQuotes[i].name,
        time: moment(start).format('yyyy-MM-DD'),
      });
      // break;
      if (matched) {
        // delete matched.open;
        delete matched.averageTrueRange;
        matchedTicks.push(matched);
      }
    }
    if (matchedTicks.length) {
      console.table(matchedTicks);
    }
    start = moment(start).add('1', 'd');
  }
}

const startDate = '2019-10-15';
const endDate = '2019-12-15';

run(startDate, endDate);
