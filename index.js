require('dotenv').config();

const https = require('https');

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
    updateInterval: minutes(3)
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
    let processedAlerts = db.get('processedAlerts');
    alerts.forEach(alert => {
        let { uuid } = alert;
        let isProcessed = processedAlerts.value().includes(uuid);
        
        if (!isProcessed) {
            // Notify alert and then add to database
            processedAlerts.push(uuid).write();
        }
    });
}

function processUsers(users) {
    console.log('processing users');
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
