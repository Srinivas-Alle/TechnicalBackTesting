/* eslint-disable no-continue */
/* eslint-disable no-await-in-loop */
const elasticUtil = require('./../utils/elastic');

const indexName = 'ticks_30min';

const compareEma = (shortEma, longEma) => {
  if (shortEma < longEma) return -1;
  if (shortEma > longEma) return 1;
  return 0;
};
const isEmaCrossOverHappened = (todayTick, previousDayTick) => {
  const todayCompare = compareEma(todayTick.ema20, todayTick.ema50);
  const previousDayCompare = compareEma(previousDayTick.ema20, previousDayTick.ema50);

  if (previousDayCompare === todayCompare) return 0;
  return todayCompare;
};


const goForTrade = (ticks) => {
  console.log('### potential trade time', ticks[0]);
};
const isQuoteClosedInBullishZone = (low, shortEma, longEma) => low < shortEma && low > longEma;
const isQuoteClosedInBearishZone = (high, shortEma, longEma) => high > shortEma && high < longEma;
const numberOfCandlesQuoteInZone = (ticks) => {
  let i = 0;
  while (i < ticks.length) {
    const tick = ticks[i];
    const { high, ema20, ema50 } = tick;
    if (!isQuoteClosedInBearishZone(high, ema20, ema50)) return i;
    i += 1;
  }
  return 0;
};

const tradeForBearishCrossOver = (ticks) => {
  console.log('Bearish cross over happened');
  console.log(ticks[0].time);
  let isInZone = false;
  const zoneReachCount = 0;
  for (let i = 1; i < ticks.length; i += 1) {
    const tick = ticks[i];
    const { high, ema20, ema50 } = tick;
    if (compareEma(ema20, ema50) > -1) break;
    if (isQuoteClosedInBearishZone(high, ema20, ema50) && !isInZone) {
      const candleCount = numberOfCandlesQuoteInZone(ticks.slice(i));
      i += candleCount;
      console.log('outof bearish zone, time to Enter, tick', ticks[i].time);
      isInZone = false;
      return i;
    }
  //  console.log('outof bearish zone, time to Enter, tick',tick);
  }
};

const tradeForBullishCrossOver = (ticks) => {
  let zoneTradedCount = 0;
  let isZoneTested = false;
  for (let i = 0; i < ticks.length; i += 1) {
    const todayTick = ticks[i];

    if (compareEma(todayTick.ema20, todayTick.ema50) < 1) break;
    if (isQuoteClosedInBullishZone(todayTick) && isZoneTested) continue;
    if (isQuoteClosedInBullishZone(todayTick) && !isZoneTested) {
      isZoneTested = true;
      zoneTradedCount += 1;
    }
    if (!isQuoteClosedInBullishZone(todayTick)) {
      isZoneTested = false;
    }
    if (zoneTradedCount === 2) {
      goForTrade(todayTick);
    }
  }

  // ticks.forEach((tick) => {
  //   const { low, ema20, ema50 } = tick;
  //   if(compareEma(previousDayTick.ema20, previousDayTick.ema50) === -1) return;
  //   if (isQuoteMovedInZone(low, ema20, ema50) && !isZoneTested) {
  //     isZoneTested = true;
  //     zoneTradedCount += 1;
  //   } else {
  //     isZoneTested = false;
  //   }
  // });
  // console.log('Bullish cross over happened', ticks[0], ticks[1]);
};

const performScanOnTheStock = (ticks) => {
  for (let i = 1; i < ticks.length; i += 1) {
    const compare = isEmaCrossOverHappened(ticks[i], ticks[i - 1]);
    if (compare === 0) continue;
    if (compare < 0) {
      tradeForBearishCrossOver(ticks.slice(i));
      continue;
    }
  //  tradeForBullishCrossOver(ticks.slice(i - 1));
  }
};

const backTestForAllStocks = async (startDate) => {
  const endDate = new Date();
  startDate = new Date(startDate);

  while (startDate < endDate) {
    const tempStart = new Date(startDate);
    const nextMonth = new Date(tempStart.setMonth(tempStart.getMonth() + 1));
    const allTicksOfMonth = await elasticUtil.getAllQuotesFromRange(indexName,
      startDate, nextMonth);
    // console.log(allTicksOfMonth);
    allTicksOfMonth.forEach((tickOfMonth) => performScanOnTheStock(tickOfMonth));
    startDate = nextMonth;
  }
};

module.exports = {
  isEmaCrossOverHappened,
  backTestForAllStocks,
};
const startTime = '2019-09-22T08:15:00+05:30';

backTestForAllStocks(startTime);
