const moment = require('moment');
const fs = require('fs');
const lodash = require('lodash');

// constants
const startDate = '2015-01-05'; // monday  // format: yyyy-mm-dd
const diwaliDays = ['2016-10-30']; // it's a sunday but stock exchange is open! make sure to add this manually after running the script

const generateWeekDates = () => {
    // const startDate = '2018-01-01';
    const startDate = '2015-01-05';
    const dates = [];
    const todayDate = moment().format().split('T')[0];
    let currDate = startDate;
    while (moment(currDate) < moment(todayDate)) {
        dates.push(currDate); // mon
        const currDate1 = moment(currDate).add(1, 'days').format().split('T')[0];
        if (moment(currDate1) < moment(todayDate))
            dates.push(currDate1); // tues
        const currDate2 = moment(currDate).add(2, 'days').format().split('T')[0];
        if (moment(currDate2) < moment(todayDate))
            dates.push(currDate2); // wed
        const currDate3 = moment(currDate).add(3, 'days').format().split('T')[0];
        if (moment(currDate3) < moment(todayDate))
            dates.push(currDate3); // thurs
        const currDate4 = moment(currDate).add(4, 'days').format().split('T')[0];
        if (moment(currDate4) < moment(todayDate))
            dates.push(currDate4); // fri

        currDate = moment(currDate).add(7, 'days').format().split('T')[0];
    }
    // console.log(dates);
    return dates;
};

const weekDates = generateWeekDates();

fs.writeFileSync('weekdays.csv', weekDates.join('\n'));

const holidays = fs.readFileSync('./holidays/2018.csv').toString().split('\n');

const tradingDays = lodash.difference(weekDates, holidays);

fs.writeFileSync('trading-days.csv', tradingDays.join('\n'));