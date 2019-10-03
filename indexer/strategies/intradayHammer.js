/* eslint-disable no-await-in-loop */
/* eslint-disable no-use-before-define */
/* eslint-disable no-underscore-dangle */

const elasticsearch = require('elasticsearch');
const elasticUtil = require('./../utils/elastic');
const candleStick = require('./../utils/candleStick');
const conversionUtil = require('./../utils/conversionUtil');
const technicals = require('./../utils/technical');

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
};
const isHamner = (tick) => candleStick.isHammer(tick);
const isInvertedHammer = (tick) => candleStick.isInvertedHammer(tick);

const matchStrategy = async (ticks) => {
  const isCandleCrossBolliner = await candleCrossBollinger(ticks);
  if (!isCandleCrossBolliner) return false;
  return true;
};

const candleCrossBollinger = async (ticks) => {
  const bollinger = await technicals.getBollingerBands(ticks, 20, 2);
  const latestTick = ticks[ticks.length - 1];
  const { lower, upper } = bollinger;
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
  for (let i = 0; i < ticks.length; i++) {
    const tick = ticks[i]._source;
    if (isHamner(tick)) {
      const slicedLength = i + 1;
      const sliced = ticks.slice(0, slicedLength).map((slicedTick) => slicedTick._source);

      const match = await matchStrategy(sliced);
      // console.log('candle hammer..', tick.time);
      if (match) {
        console.log('candle crossed bollinger..', tick.time);
      }
    }
    if (isInvertedHammer(tick)) {
      // console.log('inveted hammer at ', tick.time);
      const slicedLength = i + 1;
      const sliced = ticks.slice(0, slicedLength).map((slicedTick) => slicedTick._source);

      const match = await matchStrategy(sliced);
      // console.log('candle hammer..', tick.time);
      if (match) {
        console.log(' inveted ... candle crossed bollinger..', tick.time);
      }
    }
  }
  console.log(response.hits.hits.length);
};

getQuotesOfStock('ACC');
