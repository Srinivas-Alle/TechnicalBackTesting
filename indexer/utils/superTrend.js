/* eslint-disable no-param-reassign */

const tulind = require('tulind');
const techUtil = require('./technical');
const technical = require('./technical');


console.log('Tulip Indicators version is:');
console.log(tulind.version);


const getBasicUpperBand = (tick, multiPlier) => {
  const { high, low, averageTrueRange } = tick;
  const num = (((high + low) / 2) + (multiPlier) * averageTrueRange);
  return Math.round((num + Number.EPSILON) * 100) / 100;
};


const getBasicLowerBand = (tick, multiPlier) => {
  const { high, low, averageTrueRange } = tick;
  const num = (((high + low) / 2) - (multiPlier) * averageTrueRange);

  return Math.round((num + Number.EPSILON) * 100) / 100;
};

const getFinalUpperBand = (basicUpperBand,
  basicLowerBand,
  prevfinalUpperBand = 0,
  prevFinalLowerBand = 0,
  prevClose) => {
  if (basicUpperBand <= prevfinalUpperBand || prevClose > prevfinalUpperBand) {
    return basicUpperBand;
  }
  return prevfinalUpperBand;
};
const getFinalLowerBand = (basicUpperBand,
  basicLowerBand,
  prevfinalUpperBand = 0,
  prevFinalLowerBand = 0,
  prevClose) => {
  if (basicLowerBand >= prevFinalLowerBand || prevClose < prevFinalLowerBand) {
    return basicLowerBand;
  }
  return prevFinalLowerBand;
};
const getSuperTrend = async (ticks, atrPeriod, multiplier) => {
  ticks.forEach((tick) => {
    delete tick.averageTrueRange;
  });
  const atrTicks = await techUtil.applyAverageTrueRange(ticks, atrPeriod);
  for (let i = 0; i < atrTicks.length; i += 1) {
    const tick = atrTicks[i];
    if (!tick.averageTrueRange) continue;
    const basicUpperBand = getBasicUpperBand(tick, multiplier);
    const basicLowerBand = getBasicLowerBand(tick, multiplier);
    const atrTick = i === 0 ? {} : atrTicks[i - 1];
    let {
      finalUpperBand: prevfinalUpperBand,
      finalLowerBand: prevfinalLowerBand,
      close: prevClose,
    } = atrTick;
    let prevSuperTrend = atrTick[`superTrend${atrPeriod}_${multiplier}`];

    prevfinalUpperBand = prevfinalUpperBand || basicUpperBand;
    prevfinalLowerBand = prevfinalLowerBand || basicLowerBand;
    prevSuperTrend = prevSuperTrend || prevfinalLowerBand;
    const finalUpperBand = getFinalUpperBand(basicUpperBand, basicLowerBand,
      prevfinalUpperBand, prevfinalLowerBand, prevClose);

    const finalLowerBand = getFinalLowerBand(basicUpperBand, basicLowerBand,
      prevfinalUpperBand, prevfinalLowerBand, prevClose);

    tick.finalLowerBand = finalLowerBand;
    tick.finalUpperBand = finalUpperBand;

    let superTrend;
    if (prevSuperTrend === prevfinalUpperBand && tick.close < finalUpperBand) {
      superTrend = finalUpperBand;
    } else if (prevSuperTrend === prevfinalUpperBand && tick.close > finalUpperBand) {
      superTrend = finalLowerBand;
    } else if (prevSuperTrend === prevfinalLowerBand && tick.close > finalLowerBand) {
      superTrend = finalLowerBand;
    } else if (prevSuperTrend === prevfinalLowerBand && tick.close < finalLowerBand) {
      superTrend = finalUpperBand;
    }
    tick[`superTrend${atrPeriod}_${multiplier}`] = superTrend;
  }

  return atrTicks;
};
module.exports = {

  getSuperTrend,

};
