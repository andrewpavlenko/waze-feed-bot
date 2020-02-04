require('dotenv').config();

const https = require('https');
const schedule = require('node-schedule');
const handlers = require('./alerts');
const logger = require('./logger');
const workers = require('./workers');

const options = {
    // Konotop
    areaBounds: {
        left: 33.11674118041993,
        right: 33.28977584838868,
        top: 51.284594059368345,
        bottom: 51.18256910453232
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
    requestUrl: 'https://www.waze.com/row-rtserver/web/TGeoRSS?tk=community&format=JSON'
};

const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const adapter = new FileSync('db.json');
const db = low(adapter);

const dbDefaults = {
    processedAlerts: [],
    users: []
};

db.defaults(dbDefaults)
.write();

// Init workers after db state initialized
workers.initWorkers();

schedule.scheduleJob('*/20 * * * * * ', getUpdates);

function getUpdates() {
    logger.info('getting updates');
    let url = addBoundsToUrl(options.requestUrl);
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
    });
}

function processData(data) {
    let { users, alerts } = data;
    if (alerts) {
        processAlerts(alerts);
    }
    if (users) {
        processUsers(users);
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

    let newAlerts = alerts.filter(alert => {
        return !processedAlerts.includes(alert.uuid);
    });
    // Notify new alerts. Do not send more than one message per second
    newAlerts.forEach((alert, index) => {
        setTimeout(() => {
            handlers.handleAlert(alert);
        }, index * 1000);
    });

    db.set('processedAlerts', [...processedAlerts, ...newAlerts.map(a => a.uuid)]).write();
}

function processUsers(users) {
    logger.info('processing users');
    db.read();
    let dbUsers = db.get('users');
    let timestamp = Date.now();

    users.forEach(user => {
        let matchedUser = dbUsers.find({ id: user.id });

        if (matchedUser.value() !== undefined) {
            matchedUser.assign({ lastSeen: timestamp }).write();
        } else {
            let { id, mood, userName } = user;
            dbUsers.push({
                id,
                mood,
                userName,
                lastSeen: timestamp
            })
            .write();
        }
    });
}

function addBoundsToUrl(url) {
    let bounds = options.areaBounds;
    Object.keys(bounds).forEach(key => {
        let val = bounds[key];
        url += `&${key}=${val}`;
    })
    return url;
}
