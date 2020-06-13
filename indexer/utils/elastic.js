/* eslint-disable no-param-reassign */
const BluebirdPromise = require('bluebird');

const elasticsearch = require('elasticsearch');

const client = new elasticsearch.Client({
  host: 'localhost:9200',
  apiVersion: '6.0',
});



const index = (stocks, esIndex) => {
  const body = [];
  if (stocks.length === 0) return Promise.resolve();
  stocks.forEach((doc) => {
    body.push({ index: { _index: esIndex } });
    body.push(doc);
  });

  return new BluebirdPromise((resolve, reject) => {
    client.bulk({ body }, (err, res) => {
      if (err) return reject(err);
      console.log('time taken to index: ', res.took);
      // console.log(stocks);
      return resolve();
    });
  });
};


const search = (query, indexName) => new Promise((resolve, reject) => {
  if (!indexName) throw new Error('pass Index');
  client.search({
    index: indexName,
    body: query,
  }, (err, response) => {
    if (err) {
      console.log(err);
      reject(err);
    }
    resolve(response.hits.hits);
  });
});
module.exports = {
  search,
  index,
};
// getUniqueQuotesName();
