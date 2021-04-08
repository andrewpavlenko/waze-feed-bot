require('dotenv').config();

const schedule = require('node-schedule');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const handlers = require('./alerts');
const logger = require('./logger');
const axios = require('axios');
const tg = require('./telegram');
const { config } = require('dotenv');

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
  broadcastFeedUrl: 'https://www.waze.com/row-rtserver/broadcast/BroadcastRSS?buid=22c8ece8ae5b984902e7d1c69f5db4bf&format=JSON',
};

const channelId = process.env.CHANNEL_ID;

const adapter = new FileSync('db.json');
const db = low(adapter);

const dbDefaults = {
  processedAlerts: [],
  maxWazersOnline: 0,
};

db.defaults(dbDefaults)
  .write();

schedule.scheduleJob('*/30 * * * * * ', getUpdates);
schedule.scheduleJob('*/20 * * * * * ', countWazers);
schedule.scheduleJob('0 * * * * ', sendWazersReport);

function getUpdates() {
  logger.info('getting updates');
  let url = addBoundsToUrl(options.areaBounds, options.requestUrl);

  axios.get(url)
    .then(response => {
      const data = response.data;
      processData(data);
    })
    .catch(() => logger.info(`ERROR: can't get updates`));
}

function processData(data) {
  let { alerts } = data;
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

function countWazers() {
  logger.info('counting wazers');
  let previousMaxWazersOnline = db.get('maxWazersOnline').value() || 0;

  axios.get(options.broadcastFeedUrl)
    .then(response => {
      const data = response.data;

      let actualWazersOnline = 0;
      data.usersOnJams.forEach(jam => {
        actualWazersOnline += Number(jam.wazersCount);
      });

      if (actualWazersOnline > previousMaxWazersOnline) {
        db.set('maxWazersOnline', actualWazersOnline).write();
      }
    })
    .catch(() => logger.info(`ERROR: can't count wazers`));
}

function sendWazersReport() {
  let maxWazersOnline = db.get('maxWazersOnline').value() || 0;

  if (maxWazersOnline > 0) {
    let wazersNoun = getWazersNoun(maxWazersOnline);
    let messageText = `Зафіксовано ${maxWazersOnline} ${wazersNoun} онлайн 🚙🚕🚚`;
    tg.sendMessage(channelId, messageText);
  }

  db.set('maxWazersOnline', 0).write();
}

function getWazersNoun(count) {
  switch (count) {
    case 1:
      return 'вейзер';
    case 2:
    case 3:
    case 4:
      return 'вейзери';
    default:
      return 'вейзерів';
  }
}
