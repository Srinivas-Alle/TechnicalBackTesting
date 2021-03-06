/* eslint-disable no-underscore-dangle */
/* eslint-disable no-unused-vars */
const candleStick = require('./../utils/candleStick');
const orderBuilder = require('./../tradings/orderBuilder');

const riskRewardRation = 2;
let totalProfit = 0;

const isTradeExists = (tick, order, nextTwoTicks) => {
  if (new Date(tick.time).getHours() === 15
  && new Date(tick.time).getMinutes() === 15) return false;
  nextTwoTicks = nextTwoTicks.map((tickWithSource) => tickWithSource._source);
  if (candleStick.isBullish(tick)) {
    if (order.price <= nextTwoTicks[0].high) return true;
    if (order.price <= nextTwoTicks[1].high) return true;
  } else {
    if (order.price >= nextTwoTicks[0].low) return true;
    if (order.price >= nextTwoTicks[1].low) return true;
  }
  return false;
};

const trade = (tick, ticks, order) => {
  let tradeProfit = 0;
  // eslint-disable-next-line no-underscore-dangle
  ticks = ticks.map((source) => source._source);
  const stopLoss = order.stoploss;
  let target;

  if (candleStick.isBullish(tick)) {
    target = order.price + (riskRewardRation * (order.price - stopLoss));
    for (let i = 0; i < ticks.length; i += 1) {
      if (ticks[i].low <= stopLoss) { tradeProfit = -1000; break; }
      if (ticks[i].high >= target) { tradeProfit = 2000; break; }
      // if (stopLoss < ticks[i].low) stopLoss = orderBuilder.substractBufferForExit(ticks[i].low);
      // else break;
    }
    // tradeProfit = (order.quantity * (stopLoss - order.price));
  } else {
    // price:100,
    // sl:102,

    target = (order.price) - (riskRewardRation * (stopLoss - order.price));
    for (let i = 0; i < ticks.length; i += 1) {
      if (ticks[i].high >= stopLoss) { tradeProfit = -1000; break; }
      if (ticks[i].low <= target) { tradeProfit = 2000; break; }
      // if (stopLoss > ticks[i].high) stopLoss = orderBuilder.addBufferForEntry(ticks[i].high);
      // else break;
    }
  //  tradeProfit = (order.quantity * (order.price - stopLoss));
  }
  // totalProfit += tradeProfit;
  return `${(tradeProfit)}+${order.price},${order.stoploss},${target}`;
};


const tradeTSL = (tick, ticks, order) => {
  let tradeProfit = 0;
  // eslint-disable-next-line no-underscore-dangle
  ticks = ticks.map((source) => source._source);
  let stopLoss = order.stoploss;
  if (candleStick.isBullish(tick)) {
    for (let i = 0; i < ticks.length; i += 1) {
      if (stopLoss < ticks[i].low) stopLoss = orderBuilder.substractBufferForExit(ticks[i].low);
      else break;
    }
    tradeProfit = (order.quantity * (stopLoss - order.price));
  } else {
    for (let i = 0; i < ticks.length; i += 1) {
      if (stopLoss > ticks[i].high) stopLoss = orderBuilder.addBufferForEntry(ticks[i].high);
      else break;
    }
    tradeProfit = (order.quantity * (order.price - stopLoss));
  }
  totalProfit += tradeProfit;
  return (tradeProfit);
};

const getTotalProfit = () => totalProfit;

module.exports = {
  getTotalProfit,
  trade,
  isTradeExists,
  tradeTSL,
};
