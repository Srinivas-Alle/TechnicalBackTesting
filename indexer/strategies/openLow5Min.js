/* eslint-disable no-use-before-define */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-await-in-loop */
/* eslint-disable space-infix-ops */
/**
 * Rules
 *
 * in 5 min if open is low,
 * & previous day close - todays open is not more than 2%.
 * & 5min swing is not more than 1% of stock price
 * enter at close of first 5min candle & try 2R or hold till end of the day.
 * or sl is low of 5 minute candle.
 */
const elasticUtil = require('../utils/elastic');


const getQueryToGet5minTicks = (from, to) => ({
  size: 10000,
  query: {
    bool: {
      filter: {
        script: {
          script: {
            source: `
            int hours = doc['time'].value.getHour();
            int mins = doc['time'].value.getMinute();   
            if(hours !=3 || mins !=45)return false;
            if(doc['open']==doc['low']){
              return true;
            }
            if(doc['open']==doc['high']){
              return true;
            }
            return false;
            `,
            lang: 'painless',
          },
        },
      },
      must: [
        {
          range: {
            time: {
              gte: from,
              lte: to,

            },
          },
        },
      ],
    },
  },
  sort: [
    {
      time: {
        order: 'asc',
      },
    },
  ],
});

const getQuery30Minutes = (tick) => {
  const time = new Date(tick.time).setHours(9, 15, 0, 0);
  return {
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
              time,
            },
          },
        ],
      },
    },
  };
};

const getQueryToGetDayTick = (tick) => {
  const time = tick.time.replace('09:15', '00:00');
  return {
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
              time,
            },
          },
        ],
      },
    },
  };
};

const candleOf5minutesOfDay = (tick) => ({
  size: 75,
  query: {
    bool: {
      must: [
        {
          match: {
            instrument_token: tick.instrument_token,
          },

        },
        {
          range: {
            time: {
              gte: tick.time,

            },
          },
        },
      ],
    },
  },
  sort: [
    {
      time: {
        order: 'asc',
      },
    },
  ],
});

const isBullish = (tick) => tick.close > tick.open;
const isUptrendIn30Mins = (tick) => tick.close > tick.ema20 && tick.ema20 > tick.ema50;
const idDownTrendIn30Mins = (tick) => tick.close < tick.ema20 && tick.ema20 < tick.ema50;

function is30minCriteriaMatched(pcTick, min30Tick) {
  if (isBullish(pcTick)) {
    return isUptrendIn30Mins(min30Tick);
  }
  return idDownTrendIn30Mins(min30Tick);
}


const isPercentageMatched = (tick) => {
  // less than 1% change in a 5min?
  const pcChange = (Math.abs(tick.close - tick.open)/tick.open)*100;
  return pcChange<1 && pcChange>0.5;
};


const getTicksIn5Mins = async (from, to) => {
  let all5minTicks = await elasticUtil.search(getQueryToGet5minTicks(from, to), 'ticks_5minute');
  // eslint-disable-next-line no-underscore-dangle
  all5minTicks = all5minTicks.map((tick) => tick._source);
  console.log('Log output: getTicksIn5Mins -> all5minTicks', all5minTicks.length);
  return all5minTicks;
};

const get5MinTradableTicks = async (from, to) => {
  const ticks = await getTicksIn5Mins(from, to);
  const pcMatchedArr = ticks.filter((tick) => isPercentageMatched(tick));
  console.log('Log output: get5MinTradableTicks -> isPcMatched', pcMatchedArr.length);
  const min30MatchArr = [];
  for (let index = 0; index < pcMatchedArr.length; index+=1) {
    const pcTick = pcMatchedArr[index];
    const reslut = await elasticUtil.search(getQuery30Minutes(pcTick), 'ticks_30minute');
    let min30Tick;
    try {
      min30Tick = reslut[0]._source;
    } catch (e) {
      console.error('failed to get 30minTick for ', pcTick);
      // eslint-disable-next-line no-continue
      continue;
    }
    if (is30minCriteriaMatched(pcTick, min30Tick)) {
      min30MatchArr.push(pcTick);
    }
  }
  console.log('Log output: get5MinTradableTicks -> min30MatchArr', min30MatchArr.length);
  isTickClosedPositiveForTheDay(min30MatchArr);
};

const isTickClosedPositiveForTheDay = async (_5minsTicks) => {
  let counter = 0;
  const allTrades = [];
  for (let index = 0; index < _5minsTicks.length; index+=1) {
    const tick = _5minsTicks[index];
    const result = await elasticUtil.search(getQueryToGetDayTick(tick), 'ticks_day');
    let dayTick;

    try {
      dayTick = result[0]._source;
    } catch (err) {
      console.error('failed to get dayTick for ', tick);
      // eslint-disable-next-line no-continue
      continue;
    }
    const target = getTarget(tick);
    const sl = getStopLoss(tick);

    const trade = {
      name: tick.name,
      date: tick.time,
      entry: tick.close,
      type: isBullish(tick)?'B':'S',
      target,
      sl,
    };


    if (tick.name === 'OIL AND NATURAL GAS CORP.') {
      console.log('deubber');
    }
    if (await hasGot2R(dayTick, tick, target, sl)) {
      counter+=1;
      trade.profit = 2;
    } else {
      trade.profit = (trade.type === 'B'? ((dayTick.low - tick.close)/tick.close)*100
        :((tick.close - dayTick.high)/tick.close)*100);
      if (trade.profit<-1) trade.profit = -1;
    }
    allTrades.push(trade);
  }
  console.table(allTrades);
  console.log('Log output: isTickClosedPositiveForTheDay -> counter', counter);
  console.log('success rate is ', (counter/_5minsTicks.length)*100);
};

const getTarget = (tick) => {
  let target;
  if (isBullish(tick)) {
    target = (2*(tick.close -tick.open))+tick.close;
  } else {
    target = tick.close - 2*(tick.close - tick.open);
  }
  return target.toFixed(2);
};
const getStopLoss = (tick) => tick.open;

const hasTargetMet = (target, tick, isBullishTrade) => {
  if (isBullishTrade) {
    return tick.high>=target;
  }
  return tick.low <= target;
};
const hasSLMet = (sl, tick, isBullishTrade) => {
  if (isBullishTrade) {
    return tick.low<=sl;
  }
  return tick.high >=sl;
};

const hasGot2R = (dayTick, _5minTick, target, sl) =>
// eslint-disable-next-line implicit-arrow-linebreak
// eslint-disable-next-line no-async-promise-executor
  new Promise(async (resolve) => {
    if (_5minTick.name === 'MARUTI SUZUKI INDIA.') {
      console.log('deugg');
    }

    const isBullishTrade = isBullish(_5minTick);
    let results = await elasticUtil.search(candleOf5minutesOfDay(_5minTick), 'ticks_5minute');
    results = results.map((tick) => tick._source);
    for (let index = 1; index < results.length; index+=1) {
      const tick = results[index];
      if (hasSLMet(sl, tick, isBullishTrade)) {
        resolve(false);
        return;
      }
      if (hasTargetMet(target, tick, isBullishTrade)) {
        resolve(true);
        return;
      }
    }

    resolve(false);
  });


get5MinTradableTicks('2020-06-01', '2020-06-08');

module.exports = {
};
