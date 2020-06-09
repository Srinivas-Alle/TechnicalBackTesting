/* eslint-disable no-param-reassign */
const elasticsearch = require('elasticsearch');

const client = new elasticsearch.Client({
  host: 'localhost:9200',
  apiVersion: '6.0',
});


const search = (query, indexName) => new Promise((resolve, reject) => {
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
};
// getUniqueQuotesName();
