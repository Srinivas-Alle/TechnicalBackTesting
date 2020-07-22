
const fs = require('fs');


const niftyQuotes = JSON.parse(fs.readFileSync('/Users/srinivasalle/Desktop/workspace/za/TechnicalBackTesting/indexer/data_engine/NSE_FUTURES_listed_EQ.json', 'utf8'));
const allQuotesWithTicks = niftyQuotes.map((quote) => `${quote.name}_${quote.instrument_token}`);


const years = [2020];


// eslint-disable-next-line no-unused-vars
async function indexTicksInSmallerTime(timeFrame) {
  for (let quoteIndex = 0; quoteIndex < allQuotesWithTicks.length; quoteIndex += 1) {
    const quote = allQuotesWithTicks[quoteIndex];
    for (let yearIndex = 0; yearIndex < years.length; yearIndex += 1) {
      const filePath = `/Users/srinivasalle/Desktop/workspace/za/TechnicalBackTesting/indexer/data_engine/zerodha_data/${timeFrame}/${years[yearIndex]}/${quote}.json`;
      const filePath1 = `/Users/srinivasalle/Desktop/workspace/za/TechnicalBackTesting/indexer/data_engine/zerodha_data/${timeFrame}/${years[yearIndex]}/${quote}.json`;
      const ticks = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const {length} = ticks;
      ticks.length = length - 1;

      fs.writeFileSync(filePath1, JSON.stringify(ticks));
      // console.log('Log output: indexTicksInSmallerTime -> ticks', ticks);

      // console.log(stockTicks);
    }
  }
}

indexTicksInSmallerTime('day');
// eslint-disable-next-line no-unused-vars


// indexTicks('10minute');
