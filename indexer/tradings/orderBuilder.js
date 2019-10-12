// caliculate Entry.
// calculate stoploss
// quantity
// return tickName,entry,exit,sl, Buy or sell
const capital = 100000;
const maxSimultanousTrades = 1;
const riskPercentage = 1;
const maxCapitalPerTrade = Math.floor(capital / maxSimultanousTrades);
const maxLossPerTrade = Math.floor(riskPercentage * (capital / (100)));

const getQuantity = (entry) => Math.floor(maxCapitalPerTrade / entry);

const addBufferForEntry = (price) => {
  price = Number(price);
  if (price < 150) return price + 0.35;
  if (price < 350) return price + 0.7;
  if (price < 700) return price + 1.4;
  if (price < 3500) return price + 2.1;
  return price + 2.8;
};

const substractBufferForExit = (price) => {
  if (price < 150) return price - 0.35;
  if (price < 350) return price - 0.7;
  if (price < 700) return price - 1.4;
  if (price < 3500) return price - 2.1;
  return price + 2.8;
};
const roundToSingleDigit = (num) => Math.round(num * 10) / 10;

const getEntryExit = (tick, orderType) => {
  const { high, low } = tick;
  const entry = roundToSingleDigit(addBufferForEntry(high));

  const stoploss = roundToSingleDigit(substractBufferForExit(low));
  if (orderType === 'b') {
    return {
      entry,
      stoploss,
    };
  }
  return {
    entry: stoploss,
    stoploss: entry,
  };
};

const getMaxStopLoss = (quantity, entry, stopLoss) => {
  const lossPerTrade = Math.abs(quantity * (entry - stopLoss));
  if (lossPerTrade < maxLossPerTrade) return stopLoss;

  if (entry < stopLoss) entry = stopLoss; // short selling
  const num = Math.abs(entry - maxLossPerTrade / quantity);
  return Math.round(num * 10) / 10;
};

const getOrderDetails = (tick, orderType) => {
  const { entry, stoploss } = getEntryExit(tick, orderType);
  const quantity = getQuantity(entry);
  const adjustedStopLoss = getMaxStopLoss(quantity, entry, stoploss);
  return {
    entry,
    stoploss: adjustedStopLoss,
    quantity,
  };
};

const buildOrders = (ticks) => {
  const orders = [];
  ticks.forEach((tick) => {
    const orderType = tick.open > tick.close ? 's' : 'b';
    const { entry, stoploss, quantity } = getOrderDetails(tick, orderType);
    orders.push({
      symbol: tick.symbol,
      price: entry,
      stoploss,
      transaction_type: orderType,
      quantity,
    });
  });
  return orders;
};

// const orders = buildOrders([
//   {
//     time: "2019-10-01T11:15:00+05:30",
//     symbol: "CONCOR",
//     open: "641",
//     high: "666",
//     low: "636.9",
//     close: "638.6",
//     volume: "2882768"
//   }]);
// console.log(orders);
module.exports = {
  buildOrders,
  addBufferForEntry,
  substractBufferForExit,

};
