/* eslint-disable no-param-reassign */
const axios = require('axios');
const moment = require('moment');

const encToken = 'Ed+SpMsheqXiuNvp9pxmqTOBgSWq3bMSQZH0i17n7Q5OOarx8MAIiTd0TziYmI2f4+xReNgy8T5IVFlcegGfSYTRZ7sBpg==';

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


const requestBySplittingTime = (tickName,
  insToken,
  timeFrame,
  startTime,
  endTime) => new Promise((resolve) => {
  const promises = [];
  let endDate = startTime;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    startTime = moment(endDate).format('YYYY-MM-DD');
    endDate = moment(startTime).add(2, 'M').format('YYYY-MM-DD');
    if (moment(endDate).isAfter(endTime)) {
      promises.push(fetchData(insToken, timeFrame, startTime, endTime));
      break;
    }
    promises.push(fetchData(insToken, timeFrame, startTime, endDate));
    endDate = moment(endDate).add(1, 'd');
  }

  Promise.all(promises).then((results) => {
    let candles = [];
    results.forEach((result) => {
      candles = candles.concat(result.data.data.candles);
    });

    resolve(candles);
  });
});
module.exports = {
  fetchData,
  requestBySplittingTime,
};
