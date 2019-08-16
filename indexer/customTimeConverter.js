/* eslint-disable no-continue */
const moment = require('moment');
const elasticsearch = require('elasticsearch');

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

const convertTo5Mins = (minsTicks, tickName) => {
  const fiveMinTicks = [];
  let volume = 0; let open = 0; let high = 0; let
    low = 0;
    // eslint-disable-next-line no-plusplus
  for (let i = 0; i < minsTicks.length; i++) {
    // eslint-disable-next-line no-underscore-dangle
    const tick = minsTicks[i]._source;
    const date = new Date(tick.time);
    if (date.getHours() < 9) continue;
    if (date.getHours() === 9 && date.getMinutes() < 16) continue;
    if (date.getHours() === 15 && date.getMinutes() > 30) continue;
    if (date.getHours() > 15) continue;
    volume += tick.volume;
    if (low === 0) low = tick.low;
    if (open === 0) open = tick.open;

    if (tick.high > high) high = tick.high;
    if (tick.low < low) low = tick.low;

    if (date.getMinutes() % 5 === 0) {
      fiveMinTicks.push({
        name: tickName,
        open,
        high,
        low,
        close: tick.close,
        volume,
        time: moment(tick.time).subtract(5, 'minutes').format(),
      });

      // eslint-disable-next-line no-multi-assign
      low = high = open = 0;
      volume = 0;
    }
  }
  return fiveMinTicks;
};

const getQuotes = async (quote) => {
  const { name, time } = quote;
  const count = await client.count({
    index: 'ticks_1min',
    body: getCountQuery(name, time),

  });
  console.log(count);

  const body = getSearchQuery(name, time);
  const response = await client.search({
    index: 'ticks_1min',
    body,
  });

  const fiveMinTicks = convertTo5Mins(response.hits.hits, quote.name);
  console.log(fiveMinTicks);
};
// const index5MinTicks = async (fiveMinTicks) => {

// };

getQuotes({ name: 'acc', time: '2019-08-14T09:08:00+05:30' });
