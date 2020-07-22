/* eslint-disable no-param-reassign */
const axios = require('axios');
const moment = require('moment');

const encToken = 'HpErTFLj9rTQBbxV2BAQwPqD1IgafimjLrOOtlKBQzP4iLDUouD7H4bS96ETrRSfXtWdBb9YY2KYWVrS+MKQJni09vAj9A==';

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

const getFetchPromises = (insToken, timeFrame, startTime, endTime) => {
  if (timeFrame === 'week') {
    return [fetchData(insToken, timeFrame, startTime, endTime)];
  }
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
  return promises;
};

const requestBySplittingTime = (tickName,
  insToken,
  timeFrame,
  startTime,
  endTime) => new Promise((resolve) => {

  const promises = getFetchPromises(insToken, timeFrame, startTime, endTime);
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
