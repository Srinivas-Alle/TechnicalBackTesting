/* eslint-disable no-await-in-loop */
/* eslint-disable no-use-before-define */
/* eslint-disable no-underscore-dangle */

const elasticsearch = require('elasticsearch');
const elasticUtil = require('./../utils/elastic');
const candleStick = require('./../utils/candleStick');
const technicals = require('./../utils/technical');
const orderBuilder = require('../tradings/orderBuilder');
const orderTrader = require('../tradings/orderTrader');

const client = new elasticsearch.Client({
  host: 'localhost:9200',
  apiVersion: '5.5',
});
const getCountQuery = (name, time) => ({
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
              gt: time,
            },
          },
        },
      ],
    },
  },
});
const getSearchQuery = (name, time) => ({
  size: 10000,
  from: 0,
  sort: [
    {
      time: {
        order: 'asc',
      },
    },
  ],
  ...getCountQuery(name, time),
});
const uniqueQuotes = async () => {
  const quotes = await elasticUtil.getUniqueQuotesName();
  return quotes;
};
const isHamner = (tick) => candleStick.isHammer(tick);
const isInvertedHammer = (tick) => candleStick.isInvertedHammer(tick);

const matchStrategy = async (ticks) => {
  const isCandleCrossBolliner = await candleCrossBollinger(ticks);
  if (!isCandleCrossBolliner) return false;
  return true;
};

const isBollingerSqueezed = (upper, lower, price) => {
  const bollingerRange = upper - lower;
  // console.log(upper, lower, bollingerRange);
  return bollingerRange < price * (1 / 100);
};
const candleCrossBollinger = async (ticks) => {
  const bollinger = await technicals.getBollingerBands(ticks, 20, 2);
  const latestTick = ticks[ticks.length - 1];
  const { lower, upper } = bollinger;
  if (isBollingerSqueezed(upper[upper.length - 1],
    lower[lower.length - 1], latestTick.open)) return false;

  if (candleStick.isInvertedHammer(latestTick)) {
    return latestTick.high >= upper[upper.length - 1];
  }
  // console.log(latestTick.low, lower[lower.length - 1]);
  return latestTick.low <= lower[lower.length - 1];
};


const getQuotesOfStock = async (quote) => {
  const time = '2017-12-31T09:15:00+05:30';
  const body = getSearchQuery(quote, time);
  const response = await client.search({
    index: 'ticks_60min',
    body,
  });
  const ticks = response.hits.hits;
  for (let i = ticks.length - 1; i >= 0; i -= 1) {
    const tick = ticks[i]._source;
    if (isHamner(tick) || isInvertedHammer(tick)) {
      const slicedLength = i + 1;
      const sliced = ticks.slice(0, slicedLength).map((slicedTick) => slicedTick._source);
      const match = await matchStrategy(sliced);
      // console.log('hammer on ', tick.time);
      if (match) {
        const order = orderBuilder.buildOrders([tick]);
        if (orderTrader.isTradeExists(tick, order[0], [ticks[i + 1], ticks[i + 2]])) {
          const profitFromTrade = orderTrader.trade(tick, ticks.slice((i + 1)), order[0]);
          console.log(`${tick.time}: ${isHamner(tick) ? 'hammer' : 'inverted'}:${profitFromTrade}`);
        }

        // if (isHamner(tick)) console.log('hammer..', tick.time);
        // else console.log('inverted..', tick.time);
        // console.log(profitFromTrade);
      }
    }
  }
  console.log('profit for Quote', quote, orderTrader.getTotalProfit());
  // console.log(response.hits.hits.length);
};

// eslint-disable-next-line no-unused-vars
const backTestForAllStocks = async () => {
  const quotes = await uniqueQuotes();
  quotes.forEach((quote) => {
    getQuotesOfStock(quote);
  });
};
// backTestForAllStocks();

getQuotesOfStock('ACC');
