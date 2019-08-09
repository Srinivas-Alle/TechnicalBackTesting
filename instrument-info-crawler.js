const rp = require("request-promise");
const BluebirdPromise = require('bluebird');
const fs = require('fs');
const nseItems = require('./nse-data');

const request = rp.defaults({
    headers: {
        'Cache-Control': 'no-cache',
        'x-csrftoken': 'qScy4wighPvAKIJ45Vt5WnYKH9CDRAV1',
        Cookie: '__cfduid=d2a67ed29fce1386a471a12029ae5fe241525849104; _ga=GA1.2.290804802.1525849108; __utma=134287610.290804802.1525849108.1526474009.1527314099.2; __utmz=134287610.1527314099.2.2.utmcsr=google|utmccn=(organic)|utmcmd=organic|utmctr=(not%20provided); kfsession=Sn613Md0VtTIoRYPT7wfhLmMqsZSss7G; user_id=XY2056; _gid=GA1.2.1829003096.1529437938; public_token=qScy4wighPvAKIJ45Vt5WnYKH9CDRAV1',
        'Content-Type': 'application/x-www-form-urlencoded'
    }
});

const defaultMarketWatchId = 17334521;

const deleteItemFromMarketWatch = (marketWatchId, instrumentId) => {
    const options = {
        method: 'DELETE',
        url: `https://kite.zerodha.com/api/marketwatch/${marketWatchId}/${instrumentId}`,
    };
    console.log('deleting instrument:', instrumentId);
    return request(options);
};

const getMarketWatchItems = (marketWatchId) => {
    return request('https://kite.zerodha.com/api/marketwatch')
        .then((body) => {
            return JSON.parse(body).data.filter((item) => {
                return item.id == marketWatchId;
            })[0].items;
        })
};

const clearMarketWatch = () => {
    return getMarketWatchItems(defaultMarketWatchId).then((items) => {
        return BluebirdPromise.all(items.map((item) => deleteItemFromMarketWatch(defaultMarketWatchId, item.id))).then((res) => {
            console.log(res);
            console.log('deleted all items');
        }).catch((err) => {
            console.log(err);
        })
    });
};

const getItemInfo = (marketWatchId, tradingSymbol) => {
    const options = {
        method: 'POST',
        url: 'https://kite.zerodha.com/api/marketwatch/' + marketWatchId + '/items',
        form:
            { segment: 'NSE',
                tradingsymbol: tradingSymbol,
                watch_id: marketWatchId,
                weight: '40' }
    };
    return request(options);
};

const saveItemInfo = (body) => {
    body = JSON.parse(body);
    if (body.status === 'success') {
        const data = body.data;
        const line = [data.tradingsymbol, data.instrument_token, data.id, data.segment].join(',') + '\n';
        console.log(line);
        fs.appendFileSync('instruments-latest-final.csv', line);
        return data;
    } else if (body.status === 'error') {
        console.log(body);
    }
};

// items = items.slice(200, 400);
const items = nseItems.filter((item) => {
    return item[0].indexOf('-') === -1;
});
console.log(items.length);
const run = () => {
    clearMarketWatch().then(() => {
        const mapper = (item) => {
            return getItemInfo(defaultMarketWatchId, item[0])
                .then(saveItemInfo)
                .then((data) => {
                    deleteItemFromMarketWatch(defaultMarketWatchId, data.id)
                })
        };
        BluebirdPromise.map(items, mapper, { concurrency: 1 });
    })
};

run();