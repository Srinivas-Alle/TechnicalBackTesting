/* eslint-disable no-param-reassign */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-use-before-define */
/* eslint-disable no-underscore-dangle */
/**
 * configure 3 super trends.
 * 1 . super trend (9,2)
 * 2 . super trend (10,3)
 * 3 . super trend (14,3)
 *
 * Buy: When three are in green, exit when three are in red.
 *   (Entry calendar should be clsoed above, 40EMA(open candles in 10  mins))
 * Sell: When three are in red. exit when three are in green
 *   (Entry calendar should be closed below, 40EMA(open candles in 10  mins))
 */

const moment = require('moment');
const { toPairs } = require('lodash');
const elasticUtil = require('../utils/elastic');
const superTrend = require('../utils/superTrend');

let top10Ticks = ['TATA CONSULTANCY SERV LT', 'RELIANCE INDUSTRIES', 'HDFC BANK', 'HINDUSTAN UNILEVER.', 'INFOSYS',
  'BHARTI AIRTEL', 'ITC', 'BAJAJ FINANCE', 'MARUTI SUZUKI INDIA.', 'SUN PHARMACEUTICAL IND L',
];

 top10Ticks = ['HINDUSTAN UNILEVER.'];

// top10Ticks.length=1÷ ;

const getTicksQuery = (name) => ({
  size: 5000,
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
              gte: '2020-05-29',
            },
          },
        },
      ],
    },
  },

});

const run = async (params) => {
  for (let i = 0; i < top10Ticks.length; i += 1) {
    const result = await elasticUtil.search(getTicksQuery(top10Ticks[i]), 'ticks_10minute');
    let spAdded;
    let OHLCCandles;
    try {
      OHLCCandles = result.map((candle) => candle._source);

      spAdded = await superTrend.getSuperTrend(OHLCCandles, 9, 2);
      spAdded = await superTrend.getSuperTrend(spAdded, 10, 3);
      spAdded = await superTrend.getSuperTrend(spAdded, 14, 3);
      // console.log(JSON.stringify(spAdded));
      spAdded.forEach((tick) => {
      // tick.time = moment(tick.time).format('YY-MM-DD hh:mm');
        delete tick.ema20;
        delete tick.ema100;
        delete tick.ema200;
        delete tick.ema150;
        delete tick.high;
        delete tick.low;
        // delete tick.RSI14;
        delete tick.finalLowerBand;
        delete tick.finalUpperBand;
        delete tick.volume;
        delete tick.instrument_token;
      });
    } catch (error) {
      console.log(error);
    }
    // spAdded = spAdded.filter((tick) => new Date(tick.time).getMonth() === 6 && new Date(tick.time).getDate() > 8);
    // console.table(spAdded);

    getTradesFromTicks(spAdded);
  }
};

const getTradesFromTicks = (ticks) => {
  const trades = [];
  for (let i = 0; i < ticks.length; i += 1) {
    let tick = ticks[i];
    // const time = new Date(tick.time);
    // // console.log(time.getMonth());
    // if (time.getMonth() === 6) {
    //   // console.log('####', tick.time);
    // }
    if (isPossibleBuyEntry(tick, true, ticks[i-1])) {
      trades.push(tick);
      let inTrade = true;
      while (inTrade) {
        tick = ticks[i];
        inTrade = isPossibleBuyEntry(tick);

        i += 1;

        if (i >= ticks.length) {
          inTrade = false;
        }
        if (!inTrade) {
          const entryTick = trades.pop();
          entryTick.profit = getProfits(entryTick, ticks[i - 2]);
          entryTick.TradeType = 'Long';

          trades.push(entryTick);
        }
      }
    }
    if (isPossibleSellEntry(tick, true)) {
      trades.push(tick);
      let inTrade = true;
      while (inTrade) {
        tick = ticks[i];
        inTrade = isPossibleSellEntry(tick);

        i += 1;

        if (i >= ticks.length) {
          inTrade = false;
        }
        if (!inTrade) {
          const entryTick = trades.pop();
          entryTick.profit = getProfitsForSell(entryTick, ticks[i - 2]);
          entryTick.TradeType = 'Short';
          trades.push(entryTick);
        }
      }
    }
  }
  console.table(trades);
  const totalPoints = trades.reduce((accumulator, trade) => accumulator + trade.profit, 0);
  console.log(totalPoints);
};

const getProfitsForSell = (entryTick, exitTick) => {
  const SL = exitTick.superTrend9_2;
  // if (exitTick.ema50 && exitTick.ema50 > SL) {
  //   SL = exitTick.ema50;
  // }
  return (entryTick.close - SL);
};
const getProfits = (entryTick, exitTick) => {
  const SL = exitTick.superTrend9_2;
  // if (exitTick.ema50 && exitTick.ema50 > SL) {
  //   SL = exitTick.ema50;
  // }
  return (SL - entryTick.close);
};

const isPossibleSellEntry = (tick, initialEntry) => {
  return false;
  // if (initialEntry && tick.RSI14 > 50) return false;
  if (tick.close < tick.superTrend9_2 && tick.close < tick.superTrend10_3
     && tick.close < tick.superTrend14_3) {
    return tick.close < tick.ema50;
  }

  // if (tick.close < tick.superTrend9_2 && tick.close < tick.superTrend10_3
  //   && tick.close < tick.superTrend14_3) {
  //   return true;
  // }
  return false;
};

const isPossibleBuyEntry = (tick, initialEntry,oldTick) => {
//   if (tick.close > tick.superTrend9_2 && tick.close > tick.superTrend10_3
//     && tick.close > tick.superTrend14_3) {
//    return true;
//  }

  if (tick.close < tick.ema50) return false;
  if (initialEntry && tick.RSI14 < 60) return false;
  if (initialEntry && moment(tick.time).hours() > 10) return false;
  if (initialEntry && Math.abs((tick.close - tick.open)) > tick.averageTrueRange) return false;

  if (tick.close > tick.superTrend9_2 && tick.close > tick.superTrend10_3
     && tick.close > tick.superTrend14_3) {
    return true;
  }

  // if (tick.close < tick.superTrend9_2 && tick.close < tick.superTrend10_3
  //   && tick.close < tick.superTrend14_3) {
  //   return true;
  // }
  return false;
};


run();
