
const elasticsearch = require('elasticsearch');
const BluebirdPromise = require('bluebird');
const fs = require('fs');
const technicals = require('./utils/technical');


const niftyQuotes = JSON.parse(fs.readFileSync('/Users/srinivasalle/Desktop/workspace/za/TechnicalBackTesting/indexer/data_engine/NSE_FUTURES_listed_EQ.json', 'utf8'));
const allQuotesWithTicks = niftyQuotes.map((quote) => `${quote.name}_${quote.instrument_token}`);

const client = new elasticsearch.Client({
  host: 'localhost:9200',
  apiVersion: '5.5',
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


const years = [2016, 2017, 2018, 2019, 2020];

const applyEMAs = async (ticks) => {
  await technicals.get200EMA(ticks);
  await technicals.get150EMA(ticks);
  await technicals.get100EMA(ticks);
  await technicals.get50EMA(ticks);
  await technicals.get20EMA(ticks);
  await technicals.applyRSI(ticks, 14);
  await technicals.applyAverageTrueRange(ticks);
  return ticks;
};

// eslint-disable-next-line no-unused-vars
async function indexTicksOf(timeFrame) {
  for (let quoteIndex = 0; quoteIndex < allQuotesWithTicks.length; quoteIndex += 1) {
    const quote = allQuotesWithTicks[quoteIndex];
    let stockTicks = [];
    let oldTicks = [];
    for (let yearIndex = 0; yearIndex < years.length; yearIndex += 1) {
      const filePath = `/Users/srinivasalle/Desktop/workspace/za/TechnicalBackTesting/indexer/data_engine/zerodha_data/${timeFrame}/${years[yearIndex]}/${quote}.json`;
      const ticks = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      stockTicks = (ticks);
      if (yearIndex !== 0) {
        const sliced = oldTicks.slice(oldTicks.length - 200);
        stockTicks = sliced.concat(stockTicks);
      }
      stockTicks = stockTicks.map((tick) => ({
        name: quote.split('_')[0],
        instrument_token: quote.split('_')[1],
        time: tick[0],
        open: tick[1],
        high: tick[2],
        low: tick[3],
        close: tick[4],
        volume: tick[5],
      }));
      // eslint-disable-next-line no-await-in-loop
      stockTicks = await applyEMAs(stockTicks);

      if (yearIndex !== 0) {
        stockTicks = stockTicks.slice(200);
      }
      // eslint-disable-next-line no-await-in-loop
      await index(stockTicks, `ticks_${timeFrame}`, 'default');
      console.log('Log output: indexTicksOf -> stockTicks', stockTicks.length, quote, years[yearIndex]);
      oldTicks = ticks;
      // console.log(stockTicks);
    }
  }
}

// eslint-disable-next-line no-unused-vars
async function indexTicksOfForDay(timeFrame) {
  for (let quoteIndex = 0; quoteIndex < allQuotesWithTicks.length; quoteIndex += 1) {
    const quote = allQuotesWithTicks[quoteIndex];
    let stockTicks = [];
    for (let yearIndex = 0; yearIndex < years.length; yearIndex += 1) {
      const filePath = `/Users/srinivasalle/Desktop/workspace/za/TechnicalBackTesting/indexer/data_engine/zerodha_data/${timeFrame}/${years[yearIndex]}/${quote}.json`;
      const ticks = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      stockTicks = stockTicks.concat(ticks);
    }

    stockTicks = stockTicks.map((tick) => ({
      name: quote.split('_')[0],
      instrument_token: quote.split('_')[1],
      time: tick[0],
      open: tick[1],
      high: tick[2],
      low: tick[3],
      close: tick[4],
      volume: tick[5],
    }));
    // eslint-disable-next-line no-await-in-loop
    stockTicks = await applyEMAs(stockTicks);


    // eslint-disable-next-line no-await-in-loop
    await index(stockTicks, `ticks_${timeFrame}`, 'default');
    console.log('Log output: indexTicksOf -> stockTicks', stockTicks.length, quote);
  }
}

// indexTicksOfForDay('day');
// indexTicksOf('5minute');
