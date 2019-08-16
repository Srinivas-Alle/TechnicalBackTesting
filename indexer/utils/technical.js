
const BluebirdPromise = require('bluebird');


const tulind = require('tulind');

console.log('Tulip Indicators version is:');
console.log(tulind.version);

const getEMA = (ticks, day) => {
  const close = ticks.map((tick) => tick.close);
  return new BluebirdPromise((resolve, reject) => {
    tulind.indicators.sma.indicator([close], [day], (err, results) => {
      if (err) return reject(err);
      return resolve(results[0]);
    });
  });
};

const get20EMA = async (ticks) => {
  const emaValues = await getEMA(ticks, 3);

  let { length } = ticks;
  console.log(length);
  while (emaValues.length !== 0) {
    const ema = emaValues.pop();
    length -= 1;
    ticks[length].ema20 = Number(ema.toFixed(2));
  }
  console.log(ticks);
  return ticks;
};
const get50EMA = async (ticks) => {
  const emaValues = await getEMA(ticks, 50);
  let { length } = ticks;
  while (emaValues.length !== 0) {
    const ema = emaValues.pop();
    length -= 1;
    ticks[length].ema50 = Number(ema.toFixed(2));
  }
  return ticks;
};

const get100EMA = async (ticks) => {
  const emaValues = await getEMA(ticks, 100);

  let { length } = ticks;
  while (emaValues.length !== 0) {
    const ema = emaValues.pop();
    length -= 1;
    ticks[length].ema100 = Number(ema.toFixed(2));
  }
  return ticks;
};
const get150EMA = async (ticks) => {
  const emaValues = await getEMA(ticks, 150);

  let { length } = ticks;
  while (emaValues.length !== 0) {
    const ema = emaValues.pop();
    length -= 1;
    ticks[length].ema150 = Number(ema.toFixed(2));
  }

  return ticks;
};
const get200EMA = async (ticks) => {
  const emaValues = await getEMA(ticks, 200);

  let { length } = ticks;
  while (emaValues.length !== 0) {
    const ema = emaValues.pop();
    length -= 1;
    ticks[length].ema200 = Number(ema.toFixed(2));
  }

  return ticks;
};
const getATR = (ticks) => {
  const high = ticks.map((item) => item.high);
  const low = ticks.map((item) => item.low);
  const close = ticks.map((item) => item.close);

  return new BluebirdPromise((resolve, reject) => {
    tulind.indicators.atr.indicator([high, low, close], [14], (err, results) => {
      if (err) return reject(err);
      return resolve(results[0]);
    });
  });
};
const applyAverageTrueRange = async (ticks) => {
  const attrs = await getATR(ticks);

  let { length } = ticks;
  while (attrs.length !== 0) {
    const attr = attrs.pop();
    length -= 1;
    ticks[length].averageTrueRange = Number(attr.toFixed(2));
  }

  console.log(ticks);
  return ticks;
};

module.exports = {
  get20EMA,
  get50EMA,
  get100EMA,
  get150EMA,
  get200EMA,
  applyAverageTrueRange,
};
