/* eslint-disable no-underscore-dangle */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-use-before-define */
/* eslint-disable no-plusplus */
/* eslint-disable no-continue */

const elasticsearch = require('elasticsearch');
const elasticUtil = require('./utils/elastic');
const conversionUtil = require('./utils/conversionUtil');
const technicals = require('./utils/technical');

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
const index5MinTicks = async (fiveMinTicks, indexName) => {
  await elasticUtil.indexData(indexName, fiveMinTicks);
};

const getQuotes = async (quote, timeFrames) => {
  const { name } = quote;
  let { time } = quote;
  const count = await client.count({
    index: 'ticks_1min',
    body: getCountQuery(name, time),

  });
  console.log(count);
  const from = 0;
  let oneMinticks = [];

  while ((count.count - 100) > oneMinticks.length) {
    const body = getSearchQuery(name, time, from);
    const response = await client.search({
      index: 'ticks_1min',
      body,
    });
    oneMinticks = oneMinticks.concat(response.hits.hits);
    // console.log(oneMinticks.length, count);
    time = oneMinticks[oneMinticks.length - 1]._source.time;
  }
  // console.log(oneMinticks.length, count);

  let indexName;
  let timeInMins;
  for (let i = 0; i < timeFrames.length; i += 1) {
    const timeFrame = timeFrames[i];


    console.log(timeFrame);
    if (timeFrame === '5min') { timeInMins = 5; indexName = 'ticks_5min'; }
    if (timeFrame === '10min') { timeInMins = 10; indexName = 'ticks_10min'; }
    if (timeFrame === '15min') { timeInMins = 15; indexName = 'ticks_15min'; }
    if (timeFrame === '30min') { timeInMins = 30; indexName = 'ticks_30min'; }
    if (timeFrame === '60min') { timeInMins = 60; indexName = 'ticks_60min'; }


    let ticks = await conversionUtil.convertToTimeFrame(oneMinticks, quote.name, timeInMins);
    // console.log(ticks, quote);
    ticks = await applyEMAs(ticks);
    await index5MinTicks(ticks, indexName);
  }


  // console.log(ticks);
};

const applyEMAs = async (ticks) => {
  await technicals.get200EMA(ticks);
  await technicals.get150EMA(ticks);
  await technicals.get100EMA(ticks);
  await technicals.get50EMA(ticks);
  await technicals.get20EMA(ticks);
  await technicals.applyAverageTrueRange(ticks);
  return ticks;
};

const convertQuotes = async () => {
  const quotes = await elasticUtil.getUniqueQuotesName();
  // console.log(quotes);
  for (let i = 0; i < quotes.length; i++) {
    console.log(`${i} of ${quotes.length}, ${quotes[i]}`);
    await getQuotes({ name: quotes[i], time: '2017-12-31T09:08:00+05:30' }, ['5min', '30min', '60min']);
    // getQuotes({ name: 'ACC', time: '2019-09-29T09:08:00+05:30' }, '10min');
    // getQuotes({ name: 'ACC', time: '2019-09-29T09:08:00+05:30' }, '15min');
    // await getQuotes({ name: quotes[i], time: '2017-12-31T09:08:00+05:30' }, '30min');
    // await getQuotes({ name: quotes[i], time: '2017-12-31T09:08:00+05:30' }, '60min');
  }
};

convertQuotes();
