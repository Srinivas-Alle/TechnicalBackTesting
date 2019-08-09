const fs = require('fs');
const elasticsearch = require('elasticsearch');
const lodash = require('lodash');
const BluebirdPromise = require('bluebird');
const moment = require('moment');
const calender = require('../utils/calender');
const elasticHelper = require('../helpers/elastic');

const client = new elasticsearch.Client({
    host: 'localhost:9200',
    apiVersion: '5.5',
});

const getQuery = (date, params) => {
    return {
        "query": {
            "bool": {
                "filter": [
                    {
                        "range": {
                            "time": {
                                "gte": date,
                                "lt": moment(date).add(1, 'days').format()
                            }
                        }
                    },
                    {
                        "script": {
                            "script": {
                                "inline": "(doc['close'].value - doc['open'].value) > (params.width * (doc['high'].value - doc['close'].value)) ",
                                "lang": "painless",
                                "params": {
                                    "width": params.width
                                }
                            }
                        }
                    },
                    {
                        "script": {
                            "script": {
                                "inline": "(doc['close'].value - doc['open'].value) > (params.width * (doc['open'].value - doc['low'].value))",
                                "lang": "painless",
                                "params": {
                                    "width": params.width
                                }
                            }
                        }
                    },
                    {
                        "script": {
                            "script": {
                                "inline": "doc['volume'].value * doc['close'].value > " + params.turnover,
                                "lang": "painless"
                            }
                        }
                    },
                    {
                        "script": {
                            "script": {
                                "inline": "100 * (doc['close'].value - doc['open'].value) / doc['open'].value >= " + params.minPercentChange,
                                "lang": "painless"
                            }
                        }
                    },
                    {
                        "script": {
                            "script": {
                                "inline": "100 * (doc['close'].value - doc['open'].value) / doc['open'].value < " + params.maxPercentChange,
                                "lang": "painless"
                            }
                        }
                    },
                    {
                        "term": {
                            "tillTime.keyword": params.entryTime
                        }
                    },
                    {
                        "exists": {
                            "field": "close"
                        }
                    }
                ]
            }
        }
    }
};

const getClosePrice = (name, date, time) => {
    const query = {
        "query": {
            "bool": {
                "filter": [
                    {
                        "term": {
                            "name.keyword": name,
                        }
                    },
                    {
                        "range": {
                            "time": {
                                "gte": date,
                                "lt": moment(date).add(1, 'days').format()
                            }
                        }
                    },
                    {
                        "term": {
                            "tillTime.keyword": time
                        }
                    }
                ]
            }
        }
    };
    // console.log(name, date);
    return new BluebirdPromise((resolve, reject) => {
        client.search({
            index: 'scrips_till',
            type: 'scrip',
            body: query
        }, (err, res) => {
            if (err) console.log(err);
            if (res.hits.hits[0]) {
                resolve(res.hits.hits[0]._source);
            } else {
                resolve(null);
            }
        })
    });
};

const round = (num) => {
    return Math.round(num * 100) / 100;
};

const isClosePriceSameForLastFewIntervals = (name, date, tillTime) => {
    const promises = [];
    promises.push(getClosePrice(name, date, calender.prevTillTime(tillTime)));
    promises.push(getClosePrice(name, date, calender.prevTillTime(calender.prevTillTime(tillTime))));
    promises.push(getClosePrice(name, date, calender.prevTillTime(calender.prevTillTime(calender.prevTillTime(tillTime)))));
    // promises.push(getClosePrice(name, date, calender.prevTillTime(calender.prevTillTime(calender.prevTillTime(calender.prevTillTime(tillTime))))));
    return BluebirdPromise.all(promises).then((res) => {
        return (res[0].close === res[1].close) && (res[1].close === res[2].close);
    })
};

const calculatePercentWithStoplossAndTarget = (buyPrice, name, entryDate, params) => {
    const entryTimeStamp = entryDate + "T" + params.entryTime + ":00+0530";
    const exitTimeStamp = calender.nextDate(entryDate) + "T" + params.exitTime + ":00+0530";

    const stoplossPrice = buyPrice * (1 - params.stoplossPercent / 100);
    const targetPrice = buyPrice * (1 + params.targetPercent / 100);

    let percent, sellPrice;
    return elasticHelper.getOHLCForAllCandleIntervals(name, entryTimeStamp, exitTimeStamp).then((candles) => {
        for (let i = 0; i < candles.length; i++) {
            let candle = candles[i];

            // check stoploss
            if (candle.low <= stoplossPrice) {
                percent = -1 * params.stoplossPercent;
                sellPrice = stoplossPrice;
                console.log(candle.time);
                return {
                    percent,
                    sellPrice,
                    lastClose: candles[candles.length - 1].close
                }
            }

            // check target
            if (candle.high >= targetPrice) {
                percent = params.targetPercent;
                sellPrice = targetPrice;
                console.log(candle.time);
                return {
                    percent,
                    sellPrice,
                    lastClose: candles[candles.length - 1].close
                }
            }

        }
        let lastCandle = candles[candles.length - 1];
        sellPrice = lastCandle.close;
        percent = Math.round((sellPrice - buyPrice) * 100 / buyPrice * 100) / 100;
        return {
            percent,
            sellPrice,
            lastClose: sellPrice
        }
    })
};

const run = (date, params) => {
    return new BluebirdPromise((resolve, reject) => {
        const query = getQuery(date, params);
        // console.log(JSON.stringify(query));
        client.search({
            index: 'scrips_till',
            type: 'scrip',
            body: query
        }, (err, res) => {
            console.log('#################### ' + date + ' ###############');
            if (err) console.log(err);
            let totalPercentage = 0;
            let entryStocks = 0;
            const mapper = (hit) => {
                const date = moment(hit._source.time).format().split('T')[0];
                return isClosePriceSameForLastFewIntervals(hit._source.name, date, params.entryTime).then((isInvalidHit) => {
                    if (isInvalidHit) {
                        console.log('STOCK:');
                        console.log(hit._source.name, 'invalid hit');
                        return;
                    }

                    const entryPrice = hit._source.close;
                    return calculatePercentWithStoplossAndTarget(entryPrice, hit._source.name, date, params).then((obj) => {
                        console.log('STOCK:');
                        console.log(hit._source.name, entryPrice, obj.sellPrice, obj.lastClose, obj.percent);
                        totalPercentage += obj.percent;
                        entryStocks++;
                    });

                    // return getClosePrice(hit._source.name, calender.nextDate(date), params.exitTime).then((source) => {
                    //     if(!source) return;
                    //     const nextClose = source.close;
                    //     const buy = hit._source.close;
                    //     // const stoplossPercent = 50;
                    //     // const stoplossPrice = buy * (1 - stoplossPercent / 100);
                    //     let percent;
                    //     // if (source.low < stoplossPrice) {
                    //     //     percent = -1 * stoplossPercent;
                    //     // } else {
                    //     //     percent = Math.round((nextClose - buy) * 100 / buy * 100) / 100;
                    //     // }
                    //
                    //     let sellPrice;
                    //     const targetPercent = 10;
                    //     const targetPrice = buy * (1 + targetPercent / 100);
                    //     if (source.high >= targetPrice) {
                    //         percent = targetPercent;
                    //         sellPrice = targetPrice;
                    //     } else {
                    //         sellPrice = nextClose;
                    //         percent = Math.round((nextClose - buy) * 100 / buy * 100) / 100;
                    //     }
                    //
                    //     console.log(hit._source.name, buy, sellPrice, nextClose, percent);
                    //     totalPercentage += percent;
                    // });
                });
            };
            BluebirdPromise.map(res.hits.hits, mapper, { concurrency: 1 }).then(() => {
                if (totalPercentage === 0) {
                    return resolve(0);
                }
                const brokeragePercent = 0.21;
                // const brokeragePercent = 0.06;
                const effectivePercentage = round(totalPercentage / entryStocks) - brokeragePercent;
                console.log(totalPercentage, effectivePercentage);
                const principal = 100000;
                console.log('principal: ', principal);
                const profit = principal * effectivePercentage / 100;
                console.log('profit', profit);
                resolve(profit);
            });
        });
    });
};

const tradingDays = fs.readFileSync('../utils/trading-days.csv').toString().split('\n');
console.log(tradingDays.length);
// run('2018-01-01');
let totalProfit = 0;
const iterate = (i) => {
    if (!i) i = 0;
    if (i === dates.length) return;
    run(dates[i], params).then((profit) => {
        if (profit) {
            totalProfit += profit;
            console.log('totalProfit: ', totalProfit);
        }
        iterate(i+1);
    });
};

const params = {
    width: 25,
    turnover: 5000000,
    minPercentChange: 2,
    maxPercentChange: 50,
    stoplossPercent: 5,
    targetPercent: 3,
    entryTime: '14:30',
    exitTime: '15:00' // actually there is a bug here with till times.. here '15:00' means candle starting from '15:00' to '15:15'.. so closing price will be at the min of '15:15' actually
};

const getDates = (fromDate, toDate) => {
    return tradingDays.filter((date) => {
        return (moment(fromDate) <= moment(date)) && (moment(toDate) >= moment(date));
    })
};

console.log(process.argv);
const fromDate = process.argv[2];
const toDate = process.argv[3] || moment().format().split('T')[0];
const dates = getDates(fromDate, toDate);
console.log('dates: ', dates.length);
iterate();

// isClosePriceSameForLastFewIntervals('VIMTALABS', '2018-06-18', params);

// example command
// node bullish-marubozu-till-time.js 2018-01-01 2018-05-01


// P & L
// entry: 12:00, exit: 15:00 1860
// entry: 13:00, exit: 15:00 21340
// entry: 14:00, exit: 15:00 46400
// entry: 14:30, exit: 15:00 82150
// entry: 14:30, exit: 15:00 78330 with stoploss 5%
// entry: 14:45, exit: 15:00 72390
// entry: 14:45, exit: 14:45 77500
// entry: 15:00, exit: 15:00 62240
// entry: 14:15, exit: 15:00 62510
