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
  //console.log(body);
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
  //console.log(ticks.length,index);
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
module.exports = {
  indexData,
  getUniqueQuotesName,
};

getUniqueQuotesName();
