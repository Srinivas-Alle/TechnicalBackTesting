const elasticsearch = require('elasticsearch');
const BluebirdPromise = require('bluebird');

const client = new elasticsearch.Client({
  host: 'localhost:9200',
  apiVersion: '6.0',
});

const indiceExist = (index) => {
  const exist = client.indices.exists({
    index,
  });
  return exist;
};
const createIndex = async (index) => {
  await client.indices.create({
    index,
  });

  await client.indices.putMapping({
    index,
    type: '_doc',
    include_type_name: true,
    body: {

      _doc: {
        properties: {
          name: {
            type: 'keyword',
          },
          open: {
            type: 'float',
          },
          high: {
            type: 'float',
          },
          low: {
            type: 'float',
          },
          close: {
            type: 'float',
          },
          time: {
            type: 'date',
          },

          volume: {
            type: 'integer',
          },
          ema12: {
            type: 'float',
          },
          ema20: {
            type: 'float',
          },
          ema50: {
            type: 'float',
          },
          ema100: {
            type: 'float',
          },
          ema150: {
            type: 'float',
          },
          ema200: {
            type: 'float',
          },
          averageTrueRange: {
            type: 'float',
          },
        },
      },
    },


  }, (err) => {
    if (err) console.error(err);
    console.log('indice created', index);
  });
};


const pushToIndex = async (esIndex, stocks) => {
  const body = [];

  stocks.forEach((doc) => {
    body.push({ index: { _index: esIndex } });
    body.push(doc);
  });
  // console.log(body);
  return new BluebirdPromise((resolve, reject) => {
    client.bulk({ refresh: true, body }, (err, res) => {
      if (err) return reject(err);

      console.log('time taken to index: ', res.took);
      return resolve();
    });
  });
};

const indexData = async (index, ticks) => {
  const isIndexExist = await indiceExist(index);
  // console.log(ticks.length,index);
  if (!isIndexExist) {
    await createIndex(index);
  }
  await pushToIndex(index, ticks);
};

const getUniqueQuotesName = async () => {
  const query = {
    size: '0',
    aggs: {
      uniq_name: {
        terms: { field: 'name', size: 1000 },
      },
    },
  };
  const response = await client.search({
    index: 'ticks_1min',
    body: query,

  });
  let stocks = response.aggregations.uniq_name.buckets;
  stocks = stocks.map((stock) => stock.key);
  stocks = stocks.filter((name) => name.indexOf('_') === -1);
  return stocks;
};

// indexData('ticks_2min',ticks)


const getCountQuery = (name, fromTime, toTime) => ({
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
              gt: fromTime,
              lt: toTime,
            },
          },
        },
      ],
    },
  },
});
const getSearchQuery = (name, fromTime, toTime) => ({
  size: 10000,
  from: 0,
  sort: [
    {
      time: {
        order: 'asc',
      },
    },
  ],
  ...getCountQuery(name, fromTime, toTime),
});

const getQuotesOfStock = async (quote, indexName = 'ticks_60min',
  fromTime = '2017-12-31T09:15:00+05:30', toTime) => {
  const body = getSearchQuery(quote, fromTime, toTime);
  const response = await client.search({
    index: indexName,
    body,
  });
  const ticks = response.hits.hits;
  return ticks;
};

const getAllQuotesFromRange = async (indexName, startDate, endDate) => {
  const quotes = await getUniqueQuotesName();
  startDate = new Date(startDate);
  endDate = new Date(endDate);
  const allTicksOfMonth = [];
  for (let i = 0; i < quotes.length; i += 1) {
    const quote = quotes[4];
    // eslint-disable-next-line no-await-in-loop
    let ticks = await getQuotesOfStock(quote,
      indexName,
      startDate.toISOString(),
      endDate.toISOString());

    // eslint-disable-next-line no-underscore-dangle
    ticks = ticks.map((tick) => tick._source);
    allTicksOfMonth.push(ticks);
    break;
  }
  return allTicksOfMonth;
};
module.exports = {
  indexData,
  getUniqueQuotesName,
  getQuotesOfStock,
  getAllQuotesFromRange,
};
// getUniqueQuotesName();
