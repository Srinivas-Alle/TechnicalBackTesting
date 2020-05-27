/**
 * Rules
 *
 * in 5 min if open is low,
 * & previous day close - todays open is not more than 2%.
 * & 5min swing is not more than 1% of stock price
 * enter at close of first 5min candle & try 2R or hold till end of the day. or sl is low of 5 minute candle.
 */


const elasticsearch = require('elasticsearch');
// const elasticUtil = require('.././utils/elastic');
// const conversionUtil = require('./utils/conversionUtil');
// const technicals = require('./utils/technical');

const client = new elasticsearch.Client({
  host: 'localhost:9200',
  apiVersion: '5.5',
});

// get unique quotess
const body = {
  query: {
    bool: {
      filter: {
        script: {
          script: {
            source: `int hours = doc['time'].value.getHour();
                  int mins = doc['time'].value.getMinute();   
                  double low = doc['low'].value;
                  double open = doc['open'].value;
                  double high = doc['high'].value;
                  double close = doc['close'].value;
                  long volume = doc['volume'].value;
                  
                  if(hours == 3 && mins == 45 ){
                    if(open == low){
                      double perc = 100*(close-low)/open;
                      return perc<1.25 && volume!=0;
                    }
                    if(high == open){
                      double perc = 100*(open-close)/open;
                      return perc<1.25 &&  volume!=0;
                    }
                    
                  }`,

            lang: 'painless',
          },
        },
      },
      must: {
        range: {
          time: {
            gte: '2020-01-01T09:15:00+05:30',
          },
        },
      },
    },
  },
  sort: [
    {
      time: {
        order: 'asc',
      },
    },
  ],
};

const getOpenLowOrHighOpenStocks = async () => {
  const response = await client.search({
    index: 'ticks_1min',
    body,
  });
  console.log(response);
};

getOpenLowOrHighOpenStocks();
