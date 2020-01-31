require('dotenv').config();

const https = require('https');

const handlers = require('./alerts');

const options = {
    // Konotop
    // areaBounds: {
    //     left: 33.140052,
    //     right: 33.255099,
    //     top: 51.273409,
    //     bottom: 51.184777
    // },
    // Sumy
    // areaBounds: {
    //     left: 34.743942,
    //     right: 34.869877,
    //     top: 50.946607,
    //     bottom: 50.873301
    // },
    // Mykolaiv
    areaBounds: {
        left: 31.937925,
        right: 32.062687,
        top: 46.982323,
        bottom: 46.923851
    },
    requestUrl: 'https://www.waze.com/row-rtserver/web/TGeoRSS?tk=community&format=JSON',
    updateInterval: minutes(.25)
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
require('./workers').initWorkers();

startWatcher();

function startWatcher() {
    console.log('starting watcher');
    setInterval(getUpdates, options.updateInterval);
}

function getUpdates() {
    console.log('getting updates');
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
    console.log('processing alerts');
    db.read();
    let processedAlerts = db.get('processedAlerts');
    let processedAlertsValue = processedAlerts.value();

    console.log(processedAlertsValue.length);

    if (processedAlertsValue.length < 1) {
        // Init alerts state if empty. Do not send notiications
        alertsIds = alerts.map(alert => alert.uuid);
        db.set('processedAlerts', alertsIds).write();
    } else {
        let newAlerts = alerts.filter(alert => {
            return !processedAlertsValue.includes(alert.uuid);
        });
        // Notify new alerts. Do not send more than one message per second
        newAlerts.forEach((alert, index) => {
            setTimeout(() => {
                handlers.handleAlert(alert);
            }, index * 1000);
        });
    }
}

function processUsers(users) {
    console.log('processing users');
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

/*
 * Convert minutes to miliseconds
 */
function minutes(minutes) {
    return minutes * 1000 * 60;
}
