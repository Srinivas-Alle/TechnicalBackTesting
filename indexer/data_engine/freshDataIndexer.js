
const axios = require('axios');
const fs = require('fs');
const moment = require('moment');

const encToken = 'Ed+SpMsheqXiuNvp9pxmqTOBgSWq3bMSQZH0i17n7Q5OOarx8MAIiTd0TziYmI2f4+xReNgy8T5IVFlcegGfSYTRZ7sBpg==';
const niftyQuotes = JSON.parse(fs.readFileSync('/Users/srinivasalle/Desktop/workspace/za/TechnicalBackTesting/indexer/data_engine/NSE_FUTURES_listed_EQ.json', 'utf8'));

const set = {};
niftyQuotes.forEach((quote) => {
  set[quote.name] = quote.instrument_token;
});

function fetchData(instrumentToken, timeFrame, startTime, endTime) {
  return new Promise((resolve, reject) => {
    axios.get(`https://kite.zerodha.com/oms/instruments/historical/${instrumentToken}/${timeFrame}?from=${startTime}&to=${endTime}&oi=1`, {
      headers: {
        Authorization: `enctoken ${encToken}`,
      },
    }).then((result) => {
      resolve(result);
    }).catch((err) => {
      console.log('Log output: fetchData -> err', err.path, err.response.statusText);
      reject();
    });
  });
}


async function getQuotesOfPeriod(timeFrame, startTime, endTime) {
  for (let index = 0; index < niftyQuotes.length; index += 1) {
    const quote = niftyQuotes[index];
    // eslint-disable-next-line no-await-in-loop
    await requestOHLCOf(quote.name, quote.instrument_token, timeFrame, startTime, endTime);
    console.log(`done for ${quote.name}`);
  }
}
