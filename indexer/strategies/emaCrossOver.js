/* eslint-disable no-await-in-loop */

const elasticsearch = require('elasticsearch');
const elasticUtil = require('./../utils/elastic');
const candleStick = require('./../utils/candleStick');
const technicals = require('./../utils/technical');
const orderBuilder = require('../tradings/orderBuilder');

const isEmaCrossOverHappened = () => {

};


const backTestForAllStocks = async (startDate) => {
  const quotes = await elasticUtil.getUniqueQuotesName();
  const endDate = new Date();
  startDate = new Date(startDate);
  const tempStart = new Date(startDate);
  while (startDate < endDate) {
    const nextMonth = new Date(tempStart.setMonth(tempStart.getMonth() + 1));
    let allTicksOfMonth = [];
    for (let i = 0; i < quotes.length; i += 1) {
      const quote = quotes[i];
      const ticks = await elasticUtil.getQuotesOfStock(quote,
        'ticks_5min',
        startDate.toISOString(),
        nextMonth.toISOString());
      allTicksOfMonth = allTicksOfMonth.concat(ticks);
    }
    console.log(allTicksOfMonth.length,startDate,nextMonth);
    startDate = nextMonth;
  }
};

module.exports = {
  isEmaCrossOverHappened,
  backTestForAllStocks,
};
const startTime = '2018-01-01T08:15:00+05:30';

backTestForAllStocks(startTime);
