require('dotenv').config();

const https = require('https');
const schedule = require('node-schedule');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const handlers = require('./alerts');
const logger = require('./logger');
const Area = require('./area');

const options = {
  // Konotop
  areaBounds: {
    left: 33.11674118041993,
    right: 33.28977584838868,
    top: 51.284594059368345,
    bottom: 51.18256910453232,
  },
  // Sumy
  // areaBounds: {
  //     left: 34.743942,
  //     right: 34.869877,
  //     top: 50.946607,
  //     bottom: 50.873301
  // },
  // Mykolaiv
  // areaBounds: {
  //     left: 31.937925,
  //     right: 32.062687,
  //     top: 46.982323,
  //     bottom: 46.923851
  // },
  requestUrl: 'https://www.waze.com/row-rtserver/web/TGeoRSS?tk=community&format=JSON',
};

const adapter = new FileSync('db.json');
const db = low(adapter);

const dbDefaults = {
  processedAlerts: [],
};

const cityArea = new Area(options.areaBounds);

function* makeDataCollectionAreasIterator() {
  const dataCollectionAreas = [
    cityArea,
    cityArea.northWestQuarter,
    cityArea.northEastQuarter,
    cityArea.southWestQuarter,
    cityArea.southEastQuarter
  ];

  yield* dataCollectionAreas;
}

let dataCollectionAreasIterator = makeDataCollectionAreasIterator();

db.defaults(dbDefaults)
  .write();

schedule.scheduleJob('*/20 * * * * * ', getUpdates);

function getUpdates() {
  logger.info('getting updates');
  let areaIteration = dataCollectionAreasIterator.next();

  if (areaIteration.done) {
    dataCollectionAreasIterator = makeDataCollectionAreasIterator();
    getUpdates();
  } else {
    let url = addBoundsToUrl(areaIteration.value, options.requestUrl);
    https.get(url, res => {
      res.setEncoding('utf8');
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(rawData);
          processData(parsedData);
        } catch (e) {
          console.error(e.message);
        }
      });
    }).on('error', console.error);
  }
}

function processData(data) {
  let { users, alerts } = data;
  if (alerts) {
    processAlerts(alerts);
  }
}

function processAlerts(alerts) {
  logger.info('processing alerts');
  db.read();
  let processedAlerts = db.get('processedAlerts').value();

  if (processedAlerts.length < 1) {
    // Init alerts state if empty. Do not send notiications
    let alertsIds = alerts.map(alert => alert.uuid);
    db.set('processedAlerts', alertsIds).write();
  } else {
    processOnlyNewAlerts(alerts);
  }
}

function processOnlyNewAlerts(alerts) {
  let processedAlerts = db.get('processedAlerts').value();

  let newAlerts = alerts.filter(alert => !processedAlerts.includes(alert.uuid));
  // Notify new alerts. Do not send more than one message per second
  newAlerts.forEach((alert, index) => {
    setTimeout(() => {
      handlers.handleAlert(alert);
    }, index * 1000);
  });

  db.set('processedAlerts', [...processedAlerts, ...newAlerts.map(a => a.uuid)]).write();
}

function addBoundsToUrl(bounds, sourceUrl) {
  let url = sourceUrl;
  ['top', 'left', 'bottom', 'right'].forEach(key => {
    let val = bounds[key];
    url += `&${key}=${val}`;
  });
  return url;
}
