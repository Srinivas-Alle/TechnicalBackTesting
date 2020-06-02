
const csvjson = require('csvjson');
const { readFile } = require('fs');

const fs = require('fs');

/**
 * Incase we need fresh instruments data..
 * you can get by hitting
 *
 * https://api.kite.trade/instruments
 *
 * More info https://kite.trade/forum/discussion/917/instruments-symbol-traded-on-zerodha
 */

readFile('/Users/srinivasalle/Downloads/instruments.csv', 'utf-8', (err, fileContent) => {
  if (err) {
    console.log(err); // Do something to handle the error or just throw it
    throw new Error(err);
  }

  const jsonObj = csvjson.toObject(fileContent);
  const allNseEQ = jsonObj.filter((ins) => ins.exchange === 'NSE' && ins.segment === 'NSE' && ins.instrument_type === 'EQ');
  const filteredNFO = jsonObj.filter((ins) => ins.exchange === 'NFO' && ins.segment === 'NFO-FUT' && ins.instrument_type === 'FUT');

  const uniqueNFO = filteredNFO.filter((nfo, index) => {
    const findIndex = filteredNFO.findIndex((inFo) => inFo.name === nfo.name);
    return findIndex === index;
  });
  const futNames = uniqueNFO.map((uniqueFNOInner) => uniqueFNOInner.name);

  const eqFNO = allNseEQ.filter((eqnse) => futNames.includes(eqnse.tradingsymbol));


  fs.writeFileSync('NSE_FUTURES_listed_EQ.json', JSON.stringify(eqFNO));

  console.log('The file has been saved!');
});
