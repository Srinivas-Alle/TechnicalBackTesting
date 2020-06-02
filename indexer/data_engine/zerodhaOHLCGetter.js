const axios = require('axios');
const fs = require('fs');

const niftyQuotes = JSON.parse(fs.readFileSync('NSE_FUTURES_listed_EQ.json', 'utf8'));

const set = {};
niftyQuotes.forEach((quote) => {
  set[quote.name] = quote.instrument_token;
});

console.log('hell');
function fetchData(instrumentToken, timeFrame, startTime, endTime) {
  return new Promise((resolve, reject) => {
    axios.get(`https://kite.zerodha.com/oms/instruments/historical/${instrumentToken}/${timeFrame}?from=${startTime}&to=${endTime}&oi=1`, {
      headers: {
        Authorization: 'enctoken VL1nV0P9xgtrypaZjrfnDBbxXwUv+6MEsX1NQRJpVy+mL3AHVfzpCPBU0uLF0PdCl2wo61RbfS/7XSjNEOxG+0ZduVadzg==',
      },
    }).then((result) => {
      resolve(result);
    }).catch((err) => {
      console.log('Log output: fetchData -> err', err.path, err.response.statusText);
      reject();
    });
  });
}


function writeTofile(startTime, timeFrame, tickName, candles) {
  const year = new Date(startTime).getFullYear();
  const dir = `zerodha_data/${timeFrame}/${year}/`;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  const name = `${tickName}_${set[tickName]}`;
  fs.writeFileSync(`${dir}/${name}.json`, JSON.stringify(candles));
  console.log('written to path ', name, timeFrame);
}


const requestOHLCIn30Minute = (tickName, instrumentToken,
  timeFrame, startTime) => new Promise((resolve) => {
  const firstHalf = `${new Date(startTime).getFullYear()}-01-01`;
  const firstHalfEnd = `${new Date(startTime).getFullYear()}-06-30`;


  fetchData(instrumentToken, timeFrame, firstHalf, firstHalfEnd).then((res) => {
    const secondHalf = `${new Date(startTime).getFullYear()}-07-01`;
    const secondHalfEnd = `${new Date(startTime).getFullYear()}-12-31`;

    fetchData(instrumentToken, timeFrame, secondHalf, secondHalfEnd).then((secondRes) => {
      const candles = [...res.data.data.candles, ...secondRes.data.data.candles];
      writeTofile(startTime, timeFrame, tickName, candles);
      resolve();
    });
  });
});

const requestOHLCIn5Minute = (tickName,
  insToken,
  timeFrame,
  startTime) => new Promise((resolve) => {
  const year = new Date(startTime).getFullYear();
  const fn1 = fetchData(insToken, timeFrame, `${year}-01-01`, `${year}-03-01`);
  const fn2 = fetchData(insToken, timeFrame, `${year}-03-02`, `${year}-05-01`);
  const fn3 = fetchData(insToken, timeFrame, `${year}-05-02`, `${year}-07-01`);
  const fn4 = fetchData(insToken, timeFrame, `${year}-07-02`, `${year}-09-01`);
  const fn5 = fetchData(insToken, timeFrame, `${year}-09-02`, `${year}-11-01`);
  const fn6 = fetchData(insToken, timeFrame, `${year}-11-02`, `${year}-12-31`);
  Promise.all([fn1, fn2, fn3, fn4, fn5, fn6]).then((result) => {
    const candles = [...result[0].data.data.candles,
      ...result[1].data.data.candles,
      ...result[2].data.data.candles,
      ...result[3].data.data.candles,
      ...result[4].data.data.candles,
      ...result[5].data.data.candles,
    ];
    writeTofile(startTime, timeFrame, tickName, candles);
    resolve();
  });
});


const requestOHLCOf = (tickName, instrumentToken, timeFrame, startTime, endTime) => {
  if (timeFrame === '30minute' || timeFrame === '15minute') {
    return requestOHLCIn30Minute(tickName, instrumentToken, timeFrame, startTime, endTime);
  } if (timeFrame === '5minute' || timeFrame === '10inute') {
    return requestOHLCIn5Minute(tickName, instrumentToken, timeFrame, startTime, endTime);
  }
  return new Promise((resolve) => {
    fetchData(instrumentToken, timeFrame, startTime, endTime).then((res) => {
      try {
        writeTofile(startTime, timeFrame, tickName, res.data.data.candles);
      } catch (err) {
        console.log(err);
        console.error(`Faield to fetch ${tickName}, start: ${startTime}, duration:${timeFrame}`);
      } finally {
        setTimeout(() => { resolve(); }, 50);
      }
    }, () => {
      console.error(`reject: Faield to fetch ${tickName}, start: ${startTime}, duration:${timeFrame}`);
      setTimeout(() => { resolve(); }, 50);
    });
  });
};


// eslint-disable-next-line no-unused-vars
async function getQuotesOfPeriod(timeFrame, startTime, endTime) {
  for (let index = 0; index < niftyQuotes.length; index += 1) {
    const quote = niftyQuotes[index];
    // eslint-disable-next-line no-await-in-loop
    await requestOHLCOf(quote.name, quote.instrument_token, timeFrame, startTime, endTime);
    console.log(`done for ${quote.name}`);
  }
}
// getQuotesOfPeriod('5minute', '2019-01-01', '2019-12-31');
//getQuotesOfPeriod('5minute', '2017-01-01', '2017-12-31');
// getQuotesOfPeriod('5minute', '2017-01-01', '2017-12-31');
// getQuotesOfPeriod('5minute', '2016-01-01', '2016-12-31');
// getQuotesOfPeriod('5minute', '2020-01-01', '2020-12-31');
// getQuotesOfPeriod('60minute','2012-01-01','2012-12-31');
// getQuotesOfPeriod('30minute', '2016-01-01', '2016-12-31');
// getQuotesOfPeriod('30minute', '2017-07-01', '2017-12-31');
// getQuotesOfPeriod('30minute', '2018-07-01', '2018-12-31');
// getQuotesOfPeriod('30minute', '2019-07-01', '2019-12-31');
// getQuotesOfPeriod('30minute', '2020-07-01', '2020-12-31');
// getQuotesOfPeriod('60minute','2020-01-01','2020-12-31');
// getQuotesOfPeriod('60minute','2019-01-01','2019-12-31');
// getQuotesOfPeriod('60minute','2018-01-01','2018-12-31');
// getQuotesOfPeriod('60minute','2017-01-01','2017-12-31');
// getQuotesOfPeriod('60minute','2016-01-01','2016-12-31');
