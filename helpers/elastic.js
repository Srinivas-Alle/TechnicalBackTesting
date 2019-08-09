const elasticsearch = require('elasticsearch');
const BluebirdPromise = require('bluebird');
const moment = require('moment');
const calender = require('../utils/calender');

const client = new elasticsearch.Client({
    host: 'localhost:9200',
    apiVersion: '5.5',
});

// this is used by adx momentum indicator and others
const getQuery = (name, fromDate, toDate) => {
   return {
        index: 'scrips_all',
        type: 'scrip',
        body: {
            size: 10000,
                query: {
                bool: {
                    filter: [
                        {
                            term: {
                                "name.keyword": name,
                            }
                        },
                        {
                            range: {
                                "time": {
                                    "gte": fromDate,
                                    "lte": toDate
                                }
                            }
                        }
                    ]
                }
            },
            "sort": [
                {
                    "time": {
                        "order": "asc"
                    }
                }
            ]
        }
    }
};

const getOHLCData = (name, fromDate, toDate) => {
    return new BluebirdPromise((resolve, reject) => {
        client.search(getQuery(name, fromDate, toDate), (err, res) => {
            if (err) return reject(err);
            resolve(res);
        })
    });
};

const makeESCall = (query) => {
    return new BluebirdPromise((resolve, reject) => {
        client.search(query, (err, res) => {
            if (err) return reject(err);
            resolve(res);
        })
    });
};

const getDayStocksQueryForTillOHLC = (date, tillTime) => { // tillTime format: 15:00
    const queryBody =  {
        "size": 0,
        "query": {
        "bool": {
            "filter": {
                "range": {
                    "time": {
                        "gte": date,
                        "lte": date + "T" + tillTime + ":00+0530"
                    }
                }
            }
        }
    },
        "aggs": {
        "stocks": {
            "terms": {
                "field": "name.keyword",
                    "size": 10000
            },
            "aggs": {
                "maxHigh": {
                    "max": {
                        "field": "high"
                    }
                },
                "minLow": {
                    "min": {
                        "field": "low"
                    }
                },
                "totalVolume": {
                    "sum": {
                        "field": "volume"
                    }
                },
                "close": {
                    "filter": {
                        "range": {
                            "time": {
                                "gte": date + "T" + tillTime + ":00+0530",
                                "lt": date + "T" + calender.nextTillTime(tillTime) + ":00+0530"
                            }
                        }
                    },
                    "aggs": {
                        "close": {
                            "max": {
                                "field": "close"
                            }
                        }
                    }
                },
                "open": {
                    "filter": {
                        "range": {
                            "time": {
                                "gte": date + "T09:15:00+0530",
                                    "lt": date + "T09:30:00+0530"
                            }
                        }
                    },
                    "aggs": {
                        "open": {
                            "max": {
                                "field": "open"
                            }
                        }
                    }
                }
            }
        }
    }
    };
    // console.log(JSON.stringify(queryBody));

    return {
        index: 'scrips_15m',
        type: 'scrip',
        body: queryBody
    }
};

const getDailyStocksOHLCForTillTime = (date, tillTime) => {
    const query = getDayStocksQueryForTillOHLC(date, tillTime);
    return makeESCall(query).then((esResponse) => {
        return esResponse.aggregations.stocks.buckets.map((bucket) => {
            // console.log(bucket.close);
            return {
                name: bucket.key,
                time: date,
                tillTime: tillTime,
                open: bucket.open.open.value,
                high: bucket.maxHigh.value,
                low: bucket.minLow.value,
                close: bucket.close.close.value,
                volume: bucket.totalVolume.value
            }
        });
    })
};

const getQueryForDayStockData= (date) => {
    return {
        index: 'scrips_all',
        type: 'scrip',
        body: {
            size: 10000,
            query: {
                bool: {
                    filter: {
                        range: {
                            "time": {
                                "gte": date,
                                "lt": moment(date).add(1, 'days').format()
                            }
                        }
                    }
                }
            }
        }
    }
};

const addMissingData = (docs) => {
    return makeESCall(getQueryForDayStockData(docs[0].time)).then((esResponse) => {
        const stocksObj = esResponse.hits.hits.reduce((acc, hit) => {
            acc[hit._source.name] = hit._source;
            return acc;
        }, {});
        docs.forEach((doc) => {
            doc.open = stocksObj[doc.name].open;
            if (doc.open < doc.low) {
                doc.low = doc.open;
            }
        });
        return docs;
    });
};

const indexTillTimeData = (date, tillTime) => {
    return getDailyStocksOHLCForTillTime(date, tillTime).then(addMissingData).then((docs) => {
        const body = [];
        docs.forEach((doc) => {
            body.push({ index:  { _index: 'scrips_till', _type: 'scrip' } });
            body.push(doc);
            // console.log(doc);
            // console.log(doc.close);
            // if (!doc.open) {
            //     console.log(doc);
            // }
            if (!doc.close) {
                console.log(doc);
            }
        });
        // console.log(body);
        return new BluebirdPromise((resolve, reject) => {
            client.bulk({body}, (err, res) => {
                if (err) return reject(err);
                console.log('time taken to index: ', res.took);
                resolve();
            })
        })
    })
};

const getQueryForTillRange = (name, entryTime, exitTime) => {
    return {
        "size": 10000,
        "query": {
            "bool": {
                "filter": [{
                    "term": {
                        "name.keyword": name
                    }
                }, {
                    "range": {
                        "time": {
                            "gt": entryTime,
                            "lte": exitTime
                        }
                    }
                }]
            }
        },
        "sort": [
            {
                "time": {
                    "order": "asc"
                }
            }
        ]
    }
};

const getOHLCForAllCandleIntervals = (name, entryTime, exitTime) => {
    const query = getQueryForTillRange(name, entryTime, exitTime);
    // console.log(JSON.stringify(query));
    return makeESCall({
        index: 'scrips_15m',
        type: 'scrip',
        body: query
    }).then((esResponse) => {
        return esResponse.hits.hits.map((hit) => {
            return hit._source;
        });
    });
};

const getTillTimeTypeMapping = () => {
    return {
        "properties": {
            "close": {
                "type": "float"
            },
            "high": {
                "type": "float"
            },
            "low": {
                "type": "float"
            },
            "name": {
                "type": "text",
                "fields": {
                    "keyword": {
                        "type": "keyword",
                        "ignore_above": 256
                    }
                }
            },
            "open": {
                "type": "float"
            },
            "tillTime": {
                "type": "text",
                "fields": {
                    "keyword": {
                        "type": "keyword",
                        "ignore_above": 256
                    }
                }
            },
            "time": {
                "type": "date"
            },
            "volume": {
                "type": "float"
            }
        }
    }
};

const putTillTimeMapping = () => {
    const mapping = {
        index: 'scrips_till',
        type: 'scrip',
        body: getTillTimeTypeMapping(),
    };
    return putMapping(mapping);
};

const putMapping = mapping => new BluebirdPromise((resolve, reject) => {
    client.indices.putMapping(mapping, (err, info) => {
        if (err) {
            console.log(err);
            return reject(err);
        }
        console.log(info);
        resolve();
    });
});

module.exports = {
    getOHLCData,
    indexTillTimeData,
    getOHLCForAllCandleIntervals,
    putTillTimeMapping,
};