const rp = require("request-promise");
const BluebirdPromise = require('bluebird');
const fs = require('fs');
const sleep = require('sleep');

// constants
const sleepTime = 1;
const securities = fs.readFileSync('./data/nse-instruments-latest-final.csv').toString().split('\n');

console.log(securities.length);

const getSecurityOHLC = (securityToken, interval, fromDate, toDate) => {
    if (interval === 'hour') {
        interval = '60minute';
    }
    const url = `https://kitecharts.zerodha.com/api/chart/${securityToken}/${interval}?from=${fromDate}&to=${toDate}`;
    return rp(url);
};

const saveSecurityOHLC = (fileName, securityInfo, ohlcData, oneDay) => {
    const lines = ohlcData.data.candles.map((candle) => {
        candle.unshift(securityInfo.tradingsymbol);
        return candle.join(',');
    });
    console.log('saving ohlc.', securityInfo.tradingsymbol);
    fs.appendFileSync(fileName, lines.join('\n') + '\n');
    if (!oneDay) {
        sleep.sleep(sleepTime);
    }
};

const run = (fileName, interval, fromDate, toDate) => {
    const secs = securities.map((sec) => {
        return sec.split(',');
    });
    // console.log(secs.slice(0,5));
    const mapper = (sec) => {
        console.log(sec);
        return getSecurityOHLC(sec[1], interval, fromDate, toDate).then((data) => {
            data = JSON.parse(data);
            if (data.status === 'success')
                return saveSecurityOHLC(fileName, { tradingsymbol: sec[0] }, data, fromDate === toDate)
        })
    };
    const concurrency = (fromDate === toDate) ? 5 : 1;
    BluebirdPromise.map(secs, mapper, { concurrency });
};

console.log(process.argv);
const fileName = process.argv[2];
const interval = process.argv[3];
const fromDate = process.argv[4];
const toDate = process.argv[5] || fromDate;
run(fileName, interval, fromDate, toDate);

// node ohlc-crawler.js ohlc.csv day 2018-06-01 2018-06-20