/* eslint-disable no-underscore-dangle */

/* eslint-disable no-continue */
const moment = require('moment');

const isSkipTime = (date) => {
  if (date.getHours() < 9) return true;
  if (date.getHours() === 9 && date.getMinutes() < 16) return true;
  if (date.getHours() === 15 && date.getMinutes() > 30) return true;
  if (date.getHours() > 15) return true;
  return false;
};
const isTimeMatched = (date, timeInMins) => {
  const minutes = date.getMinutes();
  const hours = date.getHours();
  if (hours === 15 && minutes === 30) {
    return true;
  }
  if (timeInMins === 5) return date.getMinutes() % timeInMins === 0;
  if (timeInMins === 10) return date.getMinutes() % timeInMins === 5;
  if (timeInMins === 15) return date.getMinutes() % timeInMins === 0;
  if (timeInMins === 30) return date.getMinutes() % timeInMins === 15;
  if (timeInMins === 60) return date.getMinutes() % timeInMins === 15;

  
  return false;
};
const getTimeSubstraction = (date, timeInMins) => {
  if (date.getHours() === 15 && date.getMinutes() === 30) {
    if (timeInMins === 15 || timeInMins === 30 || timeInMins === 60) return 15;
    if (timeInMins === 10) return 5;
  }
  return timeInMins;
};

const isSameTick = (ticks, index) => {
  if (index === 0) return false;
  // eslint-disable-next-line no-underscore-dangle
  if (ticks[index]._source.time === ticks[index - 1]._source.time) {
    console.log('dupicate stick found for ', ticks[index]._source);
    return true;
  }
  return false;
};
const convertToTimeFrame = (minsTicks, tickName, timeInMins) => {
  const fiveMinTicks = [];
  let volume = 0; let open = 0; let high = 0; let
    low = 0;
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < minsTicks.length; i++) {
    // eslint-disable-next-line no-underscore-dangle
    const tick = minsTicks[i]._source;
    const date = new Date(tick.time);
    if (isSkipTime(date)) continue;
    if (isSameTick(minsTicks, i)) continue;

    volume += tick.volume;
    if (low === 0) low = tick.low;
    if (open === 0) open = tick.open;

    if (tick.high > high) high = tick.high;
    if (tick.low < low) low = tick.low;

    if (isTimeMatched(date, timeInMins)) {
      const subtraction = getTimeSubstraction(date, timeInMins);

      fiveMinTicks.push({
        name: tickName,
        open,
        high,
        low,
        close: tick.close,
        volume,
        time: moment(tick.time).subtract(subtraction, 'minutes').format(),
      });

      // eslint-disable-next-line no-multi-assign
      low = high = open = 0;
      volume = 0;
    }
  }
  return fiveMinTicks;
};
module.exports = {
  convertToTimeFrame,
};
