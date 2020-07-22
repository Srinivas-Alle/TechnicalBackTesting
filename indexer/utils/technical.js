/* eslint-disable no-param-reassign */

const BluebirdPromise = require('bluebird');


const tulind = require('tulind');

console.log('Tulip Indicators version is:');
console.log(tulind.version);


const getRSI = (ticks, day) => {
  const close = ticks.map((tick) => tick.close);
  return new BluebirdPromise((resolve, reject) => {
    tulind.indicators.rsi.indicator([close], [day], (err, results) => {
      if (err) return reject(err);
      return resolve(results[0]);
    });
  });
};


const getEMA = (ticks, day) => {
  const close = ticks.map((tick) => tick.close);
  return new BluebirdPromise((resolve, reject) => {
    tulind.indicators.ema.indicator([close], [day], (err, results) => {
      if (err) return reject(err);
      return resolve(results[0]);
    });
  });
};

const get20EMA = async (ticks) => {
  let emaValues = await getEMA(ticks, 20);

  emaValues = emaValues.slice(19);
  let { length } = ticks;

  // console.log(length);
  while (emaValues.length !== 0) {
    const ema = emaValues.pop();
    length -= 1;
    ticks[length].ema20 = Number(ema.toFixed(2));
  }
  //  console.log(ticks);
  return ticks;
};
const get50EMA = async (ticks) => {
  let emaValues = await getEMA(ticks, 50);
  emaValues = emaValues.slice(49);
  let { length } = ticks;
  while (emaValues.length !== 0) {
    const ema = emaValues.pop();
    length -= 1;
    ticks[length].ema50 = Number(ema.toFixed(2));
  }
  return ticks;
};

const get100EMA = async (ticks) => {
  let emaValues = await getEMA(ticks, 100);
  emaValues = emaValues.slice(99);

  let { length } = ticks;
  while (emaValues.length !== 0) {
    const ema = emaValues.pop();
    length -= 1;
    ticks[length].ema100 = Number(ema.toFixed(2));
  }
  return ticks;
};
const get150EMA = async (ticks) => {
  let emaValues = await getEMA(ticks, 150);
  emaValues = emaValues.slice(149);

  let { length } = ticks;
  while (emaValues.length !== 0) {
    const ema = emaValues.pop();
    length -= 1;
    ticks[length].ema150 = Number(ema.toFixed(2));
  }

  return ticks;
};
const get200EMA = async (ticks) => {
  let emaValues = await getEMA(ticks, 200);
  emaValues = emaValues.slice(199);
  let { length } = ticks;
  while (emaValues.length !== 0) {
    const ema = emaValues.pop();
    length -= 1;
    ticks[length].ema200 = Number(ema.toFixed(2));
  }

  return ticks;
};
const getATR = (ticks, period = 14) => {
  const high = ticks.map((item) => item.high);
  const low = ticks.map((item) => item.low);
  const close = ticks.map((item) => item.close);

  return new BluebirdPromise((resolve, reject) => {
    tulind.indicators.atr.indicator([high, low, close], [period], (err, results) => {
      if (err) return reject(err);
      return resolve(results[0]);
    });
  });
};
const applyAverageTrueRange = async (ticks, period = 14) => {
  const attrs = await getATR(ticks, period);

  let { length } = ticks;
  while (attrs.length !== 0) {
    const attr = attrs.pop();
    length -= 1;
    ticks[length].averageTrueRange = Number(attr.toFixed(2));
  }

  // console.log(ticks);
  return ticks;
};
const getBollingerBands = (quotes, period, stddev) => {
  const close = quotes.map((quote) => quote.close);

  return new BluebirdPromise((resolve, reject) => {
    tulind.indicators.bbands.indicator([close], [period, stddev], (err, result) => {
      if (err) reject(err);
      resolve({
        lower: result[0],
        middle: result[1],
        upper: result[2],
      });
    });
  });
};

const applyRSI = async (ticks, period) => {
  const rsiValues = await getRSI(ticks, period);

  let { length } = ticks;
  // console.log(length);
  while (rsiValues.length !== 0) {
    const ema = rsiValues.pop();
    length -= 1;
    ticks[length][`RSI${period}`] = Number(ema.toFixed(2));
  }
  // console.log(ticks);
  return ticks;
};

const applyEMAs = async (ticks) => {
  await get200EMA(ticks);
  await get150EMA(ticks);
  await get100EMA(ticks);
  await get50EMA(ticks);
  await get20EMA(ticks);
  await applyRSI(ticks, 14);
  await applyAverageTrueRange(ticks);
  return ticks;
};


module.exports = {
  get20EMA,
  get50EMA,
  get100EMA,
  get150EMA,
  get200EMA,
  applyAverageTrueRange,
  getBollingerBands,
  applyRSI,
  applyEMAs,
};
// const stocks = [
//   {
//     name: 'ZEE ENTERTAINMENT ENT',
//     instrument_token: '975873',
//     time: '2016-04-12T00:00:00+0530',
//     open: 390.75,
//     high: 406.5,
//     low: 390.75,
//     close: 405.7,
//     volume: 1556917,
//     ema50: 389.64,
//     ema20: 396.48,
//     averageTrueRange: 10.72,
//   },
//   {
//     name: 'ZEE ENTERTAINMENT ENT',
//     instrument_token: '975873',
//     time: '2016-04-13T00:00:00+0530',
//     open: 407.5,
//     high: 410,
//     low: 400.55,
//     close: 401.9,
//     volume: 1173446,
//     ema50: 389.27,
//     ema20: 400.75,
//     averageTrueRange: 10.63,
//   },
//   {
//     name: 'ZEE ENTERTAINMENT ENT',
//     instrument_token: '975873',
//     time: '2016-04-18T00:00:00+0530',
//     open: 403.4,
//     high: 409.55,
//     low: 397.75,
//     close: 407.75,
//     volume: 1792223,
//     ema50: 389.1,
//     ema20: 405.12,
//     averageTrueRange: 10.71,
//   },
//   {
//     name: 'ZEE ENTERTAINMENT ENT',
//     instrument_token: '975873',
//     time: '2016-04-20T00:00:00+0530',
//     open: 411.75,
//     high: 411.75,
//     low: 398.45,
//     close: 399.9,
//     volume: 2155336,
//     ema50: 389.06,
//     ema20: 403.18,
//     averageTrueRange: 10.9,
//   },
//   {
//     name: 'ZEE ENTERTAINMENT ENT',
//     instrument_token: '975873',
//     time: '2016-04-21T00:00:00+0530',
//     open: 401.55,
//     high: 404.2,
//     low: 395.55,
//     close: 399.3,
//     volume: 603318,
//     ema50: 388.97,
//     ema20: 402.32,
//     averageTrueRange: 10.74,
//   },
//   {
//     name: 'ZEE ENTERTAINMENT ENT',
//     instrument_token: '975873',
//     time: '2016-04-22T00:00:00+0530',
//     open: 399.3,
//     high: 404,
//     low: 398.5,
//     close: 401.1,
//     volume: 1038722,
//     ema50: 389.01,
//     ema20: 400.1,
//     averageTrueRange: 10.36,
//   },
//   {
//     name: 'ZEE ENTERTAINMENT ENT',
//     instrument_token: '975873',
//     time: '2016-04-25T00:00:00+0530',
//     open: 401.1,
//     high: 402.9,
//     low: 395.65,
//     close: 400.7,
//     volume: 953370,
//     ema50: 388.84,
//     ema20: 400.37,
//     averageTrueRange: 10.14,
//   },
//   {
//     name: 'ZEE ENTERTAINMENT ENT',
//     instrument_token: '975873',
//     time: '2016-04-26T00:00:00+0530',
//     open: 397.3,
//     high: 414.9,
//     low: 397.3,
//     close: 413.5,
//     volume: 2370767,
//     ema50: 389.06,
//     ema20: 405.1,
//     averageTrueRange: 10.67,
//   },
//   {
//     name: 'ZEE ENTERTAINMENT ENT',
//     instrument_token: '975873',
//     time: '2016-04-27T00:00:00+0530',
//     open: 411.85,
//     high: 416.8,
//     low: 406.25,
//     close: 407.85,
//     volume: 1175412,
//     ema50: 389.43,
//     ema20: 407.35,
//     averageTrueRange: 10.66,
//   },
//   {
//     name: 'ZEE ENTERTAINMENT ENT',
//     instrument_token: '975873',
//     time: '2016-04-28T00:00:00+0530',
//     open: 409,
//     high: 410.25,
//     low: 401.7,
//     close: 405,
//     volume: 2736668,
//     ema50: 389.94,
//     ema20: 408.78,
//     averageTrueRange: 10.51,
//   },
//   {
//     name: 'ZEE ENTERTAINMENT ENT',
//     instrument_token: '975873',
//     time: '2016-04-29T00:00:00+0530',
//     open: 403.2,
//     high: 416.2,
//     low: 402,
//     close: 414.9,
//     volume: 1474626,
//     ema50: 390.85,
//     ema20: 409.25,
//     averageTrueRange: 10.78,
//   },
//   {
//     name: 'ZEE ENTERTAINMENT ENT',
//     instrument_token: '975873',
//     time: '2016-05-02T00:00:00+0530',
//     open: 414,
//     high: 417.55,
//     low: 411.25,
//     close: 416.4,
//     volume: 1406101,
//     ema50: 391.77,
//     ema20: 412.1,
//     averageTrueRange: 10.46,
//   },
//   {
//     name: 'ZEE ENTERTAINMENT ENT',
//     instrument_token: '975873',
//     time: '2016-05-03T00:00:00+0530',
//     open: 415,
//     high: 422.9,
//     low: 414.9,
//     close: 419.75,
//     volume: 1808007,
//     ema50: 392.49,
//     ema20: 417.02,
//     averageTrueRange: 10.28,
//   },
//   {
//     name: 'ZEE ENTERTAINMENT ENT',
//     instrument_token: '975873',
//     time: '2016-05-04T00:00:00+0530',
//     open: 416.7,
//     high: 417.95,
//     low: 402.7,
//     close: 404.55,
//     volume: 1440825,
//     ema50: 393.33,
//     ema20: 413.57,
//     averageTrueRange: 10.76,
//   },
//   {
//     name: 'ZEE ENTERTAINMENT ENT',
//     instrument_token: '975873',
//     time: '2016-05-05T00:00:00+0530',
//     open: 404.4,
//     high: 404.9,
//     low: 396.3,
//     close: 400.45,
//     volume: 2185694,
//     ema50: 393.92,
//     ema20: 408.25,
//     averageTrueRange: 10.61,
//   },
//   {
//     name: 'ZEE ENTERTAINMENT ENT',
//     instrument_token: '975873',
//     time: '2016-05-06T00:00:00+0530',
//     open: 400,
//     high: 405.25,
//     low: 397.8,
//     close: 403.1,
//     volume: 873252,
//     ema50: 394.36,
//     ema20: 402.7,
//     averageTrueRange: 10.38,
//   },
//   {
//     name: 'ZEE ENTERTAINMENT ENT',
//     instrument_token: '975873',
//     time: '2016-05-09T00:00:00+0530',
//     open: 403,
//     high: 422.85,
//     low: 403,
//     close: 420.7,
//     volume: 1385009,
//     ema50: 395.09,
//     ema20: 408.08,
//     averageTrueRange: 11.06,
//   },
//   {
//     name: 'ZEE ENTERTAINMENT ENT',
//     instrument_token: '975873',
//     time: '2016-05-10T00:00:00+0530',
//     open: 421,
//     high: 422,
//     low: 414.5,
//     close: 417.6,
//     volume: 2321134,
//     ema50: 395.59,
//     ema20: 413.8,
//     averageTrueRange: 10.81,
//   },
//   {
//     name: 'ZEE ENTERTAINMENT ENT',
//     instrument_token: '975873',
//     time: '2016-05-11T00:00:00+0530',
//     open: 420,
//     high: 451.95,
//     low: 419,
//     close: 447.95,
//     volume: 11074720,
//     ema50: 396.8,
//     ema20: 428.75,
//     averageTrueRange: 12.49,
//   },
//   {
//     name: 'ZEE ENTERTAINMENT ENT',
//     instrument_token: '975873',
//     time: '2016-05-12T00:00:00+0530',
//     open: 448,
//     high: 450.8,
//     low: 442.05,
//     close: 447.5,
//     volume: 3706501,
//     ema50: 397.99,
//     ema20: 437.68,
//     averageTrueRange: 12.22,
//   }, {
//     name: 'ZEE ENTERTAINMENT ENT',
//     instrument_token: '975873',
//     time: '2016-05-13T00:00:00+0530',
//     open: 447,
//     high: 454.15,
//     low: 441.05,
//     close: 448.85,
//     volume: 2003016,
//     ema50: 399.38,
//     ema20: 448.1,
//     averageTrueRange: 12.28,
//   },
//   {
//     name: 'ZEE ENTERTAINMENT ENT',
//     instrument_token: '975873',
//     time: '2016-05-16T00:00:00+0530',
//     open: 452,
//     high: 458.95,
//     low: 445.7,
//     close: 447.1,
//     volume: 3336110,
//     ema50: 400.7,
//     ema20: 447.82,
//     averageTrueRange: 12.35,
//   },
//   {
//     name: 'ZEE ENTERTAINMENT ENT',
//     instrument_token: '975873',
//     time: '2016-05-17T00:00:00+0530',
//     open: 447.75,
//     high: 453,
//     low: 443.35,
//     close: 445.2,
//     volume: 2404883,
//     ema50: 402.16,
//     ema20: 447.05,
//     averageTrueRange: 12.16,
//   },
//   {
//     name: 'ZEE ENTERTAINMENT ENT',
//     instrument_token: '975873',
//     time: '2016-05-18T00:00:00+0530',
//     open: 444,
//     high: 444,
//     low: 433.7,
//     close: 435.75,
//     volume: 4031334,
//     ema50: 403.04,
//     ema20: 442.68,
//     averageTrueRange: 12.11,
//   },
//   {
//     name: 'ZEE ENTERTAINMENT ENT',
//     instrument_token: '975873',
//     time: '2016-05-19T00:00:00+0530',
//     open: 437.95,
//     high: 440.55,
//     low: 430.25,
//     close: 438.15,
//     volume: 2393541,
//     ema50: 403.82,
//     ema20: 439.7,
//     averageTrueRange: 11.98,
//   },
//   {
//     name: 'ZEE ENTERTAINMENT ENT',
//     instrument_token: '975873',
//     time: '2016-05-20T00:00:00+0530',
//     open: 436.5,
//     high: 441.2,
//     low: 432.85,
//     close: 434.4,
//     volume: 889187,
//     ema50: 404.62,
//     ema20: 436.1,
//     averageTrueRange: 11.72,
//   },
//   {
//     name: 'ZEE ENTERTAINMENT ENT',
//     instrument_token: '975873',
//     time: '2016-05-23T00:00:00+0530',
//     open: 438,
//     high: 444.4,
//     low: 434.3,
//     close: 435.65,
//     volume: 2402640,
//     ema50: 405.41,
//     ema20: 436.07,
//     averageTrueRange: 11.61,
//   },
//   {
//     name: 'ZEE ENTERTAINMENT ENT',
//     instrument_token: '975873',
//     time: '2016-05-24T00:00:00+0530',
//     open: 437.5,
//     high: 440.85,
//     low: 431.35,
//     close: 439.1,
//     volume: 2308055,
//     ema50: 406.38,
//     ema20: 436.38,
//     averageTrueRange: 11.46,
//   },
//   {
//     name: 'ZEE ENTERTAINMENT ENT',
//     instrument_token: '975873',
//     time: '2016-05-25T00:00:00+0530',
//     open: 447.5,
//     high: 447.9,
//     low: 439.75,
//     close: 442.6,
//     volume: 784790,
//     ema50: 407.32,
//     ema20: 439.12,
//     averageTrueRange: 11.27,
//   },
//   {
//     name: 'ZEE ENTERTAINMENT ENT',
//     instrument_token: '975873',
//     time: '2016-05-26T00:00:00+0530',
//     open: 441,
//     high: 446.75,
//     low: 439.6,
//     close: 444.45,
//     volume: 1784352,
//     ema50: 408.38,
//     ema20: 442.05,
//     averageTrueRange: 10.97,
//   },
//   {
//     name: 'ZEE ENTERTAINMENT ENT',
//     instrument_token: '975873',
//     time: '2016-05-27T00:00:00+0530',
//     open: 445.95,
//     high: 455,
//     low: 443,
//     close: 453.4,
//     volume: 1674549,
//     ema50: 409.47,
//     ema20: 446.82,
//     averageTrueRange: 11.05,
//   }];


// console.log(applyRSI(stocks,14));
