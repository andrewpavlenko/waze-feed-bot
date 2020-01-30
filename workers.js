const schedule = require('node-schedule');
const tg = require('./telegram');

const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const adapter = new FileSync('db.json');
const db = low(adapter);

function initWorkers() {
    console.log('init workers');
    schedule.scheduleJob('30 * * * *', function(){
        sendWazersReport();
    });
}

function sendWazersReport() {
    let wazers = db.get('users').value();
    let now = Date.now();

    wazers = wazers.filter(wazer => {
        let lastSeenAgo = (now - wazer.lastSeen) / 1000 / 60;
        console.log(lastSeenAgo);
        return lastSeenAgo < 30;
    });

    tg.sendMessage(`Вейзеров за последние 30 минут: ${wazers.length}`);
}

exports.initWorkers = initWorkers;