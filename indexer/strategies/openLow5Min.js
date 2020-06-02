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
        order: 'desc',
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
  const date = new Date(tick.time);
  const day = date.getDate()<10?`0${date.getDate()}`:date.getDate();
  let month = date.getMonth()+1;
  month = month <10?`0${month}`:month;
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

const isPercentageMatched = (tick) => {
  // less than 1% change in a 5min?
  const pcChange = ((tick.close - tick.open)/tick.open)*100;

  if (Math.abs(pcChange)<2 && Math.abs(pcChange>0.75)) {
    return true;
  }
  return false;
};


const is5MinCondtionMatched = async (bullishIn30Mins, bearishIn30Mins) => {
  const bullishTradable = [];
  const bearishTradable = [];
  for (let index = 0; index < bullishIn30Mins.length; index+=1) {
    const bulTick = bullishIn30Mins[index];
    const result = await elasticUtil.search(getQuery30Minutes(bulTick), 'ticks_5minute');
    const min5Tick = result[0]._source;
    if (isPercentageMatched(min5Tick)) {
      bullishTradable.push(min5Tick);
    }
  }

  for (let index = 0; index < bearishIn30Mins.length; index+=1) {
    const bulTick = bearishIn30Mins[index];
    const result = await elasticUtil.search(getQuery30Minutes(bulTick), 'ticks_5minute');
    const min5Tick = result[0]._source;
    if (isPercentageMatched(min5Tick)) {
      bearishTradable.push(min5Tick);
    }
  }

  console.log(...bullishTradable);
};


const isBullish = (tick) => tick.close > tick.open;

const isUptrendIn30Mins = (tick) => tick.open > tick.ema20 && tick.ema20> tick.ema50;
const idDownTrendIn30Mins = (tick) => tick.open<tick.ema20 && tick.ema20<tick.ema50;


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
    const min30Tick = reslut[0]._source;
    if (is30minCriteriaMatched(pcTick, min30Tick)) {
      min30MatchArr.push(pcTick);
    }
  }
  console.log('Log output: get5MinTradableTicks -> min30MatchArr', min30MatchArr.length);
  isTickClosedPositiveForTheDay(min30MatchArr);
};

const isTickClosedPositiveForTheDay = async (_5minsTicks) => {
  for (let index = 0; index < _5minsTicks.length; index+=1) {
    const tick = _5minsTicks[index];
    const result = await elasticUtil.search(getQueryToGetDayTick(tick), 'ticks_day');
    const dayTick = result[0]._source;
  }
};
get5MinTradableTicks('2020-01-01', '2020-04-30');

// is30minConditionMatched('2020-01-01', '2020-04-30');
module.exports = {
  is5MinCondtionMatched,
};
function is30minCriteriaMatched(pcTick, min30Tick) {
  if (isBullish(pcTick)) {
    if (isUptrendIn30Mins(min30Tick)) {
      return true;
    }
  } else if (idDownTrendIn30Mins(min30Tick)) {
    return true;
  }
  return false;
}
