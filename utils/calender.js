const fs = require("fs");
const path = require("path");
const lodash = require("lodash");
const moment = require("moment");

const tradingDaysFilePath = path.resolve(__dirname, "./trading-days.csv");
var tradingDays = fs
  .readFileSync(tradingDaysFilePath)
  .toString()
  .split("\n");
tradingDays = tradingDays.map(day => {
  return day.replace("\r", "").trim();
});

const nextDate = date => {
  const ind = lodash.indexOf(tradingDays, date);
  if (ind === -1) {
    console.log("#### Wrong date ###");
    console.log(date);
    return "error";
  }
  return tradingDays[ind + 1];
};

const tills = [
  "09:15",
  "09:30",
  "09:45",
  "10:00",
  "10:15",
  "10:30",
  "10:45",
  "11:00",
  "11:15",
  "11:30",
  "11:45",
  "12:00",
  "12:15",
  "12:30",
  "12:45",
  "13:00",
  "13:15",
  "13:30",
  "13:45",
  "14:00",
  "14:15",
  "14:30",
  "14:45",
  "15:00",
  "15:15"
];

const getTills = () => tills;

const nextTillTime = till => {
  if (till === "15:15") {
    return "15:30";
  }
  const ind = lodash.indexOf(tills, till);
  if (ind === -1) {
    console.log("#### Wrong till time ###");
    console.log(till);
    return "error";
  }
  return tills[ind + 1];
};

const prevTillTime = till => {
  if (till === "09:15") {
    return "09:00";
  }
  const ind = lodash.indexOf(tills, till);
  if (ind === -1) {
    console.log("#### Wrong till time ###");
    console.log(till);
    return "error";
  }
  return tills[ind - 1];
};

const getTradingDays = (fromDate, toDate) => {
  if (!fromDate || !toDate) throw new Error("dates cant be blank");
  return tradingDays.filter(date => {
    return moment(fromDate) <= moment(date) && moment(toDate) >= moment(date);
  });
};

module.exports = {
  nextDate,
  nextTillTime,
  prevTillTime,
  getTradingDays,
  getTills
};
