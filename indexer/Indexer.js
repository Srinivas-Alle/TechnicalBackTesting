
const fs = require('fs');
const technicals = require('./utils/technical');
const elasticUtil = require('./utils/elastic');


const niftyQuotes = JSON.parse(fs.readFileSync('/Users/srinivasalle/Desktop/workspace/za/TechnicalBackTesting/indexer/data_engine/NSE_FUTURES_listed_EQ.json', 'utf8'));
const allQuotesWithTicks = niftyQuotes.map((quote) => `${quote.name}_${quote.instrument_token}`);


const years = [2016, 2017, 2018, 2019, 2020];


// eslint-disable-next-line no-unused-vars
async function indexTicksInSmallerTime(timeFrame) {
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
      stockTicks = await technicals.applyEMAs(stockTicks);

      if (yearIndex !== 0) {
        stockTicks = stockTicks.slice(200);
      }
      // eslint-disable-next-line no-await-in-loop
      await elasticUtil.index(stockTicks, `ticks_${timeFrame}`, 'default');
      console.log('Log output: indexTicksOf -> stockTicks', stockTicks.length, quote, years[yearIndex], timeFrame);
      oldTicks = ticks;
      // console.log(stockTicks);
    }
  }
}

// eslint-disable-next-line no-unused-vars

async function indexTicks(timeFrame) {
  if (timeFrame !== 'day' && timeFrame !== 'week') {
    await indexTicksInSmallerTime(timeFrame);
    return;
  }
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
    stockTicks = await technicals.applyEMAs(stockTicks);


    // eslint-disable-next-line no-await-in-loop
    await elasticUtil.index(stockTicks, `ticks_${timeFrame}`, 'default');

    console.log('Log output: indexTicksOf -> stockTicks', stockTicks.length, quote, timeFrame);
  }
}

//  indexTicks('hour');
