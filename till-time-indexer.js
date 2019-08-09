const moment = require('moment');
const elasticHelper = require('./helpers/elastic');
const calender = require('./utils/calender');

const iterate = (i, j) => {
    console.log(i,j);
    if (!i) i = 0;
    if (!j) j = 0;
    if (i >= dates.length) return;
    if (j >= tills.length) {
        iterate(i+1, 0);
        return;
    }
    console.log(dates[i], tills[j]);
    elasticHelper.indexTillTimeData(dates[i], tills[j]).then(() => {
        console.log('till time indexed for: ', dates[i] + ' ' + tills[j]);
        iterate(i, j+1);
    });
};

console.log(process.argv);
const tillTime = process.argv[2];
const fromDate = process.argv[3];
const toDate = process.argv[4] || moment().format().split('T')[0];
const dates = calender.getTradingDays(fromDate, toDate);

let tills;
if (tillTime === 'all') {
    tills = calender.getTills();
} else {
    tills = [tillTime];
}

elasticHelper.putTillTimeMapping().then(() => {
    console.log('created mapping #######');
    iterate();
});


// 0,0
// 0,1
// 1,0
// 0,2
// 1,1
// 1,1
// 2,1
