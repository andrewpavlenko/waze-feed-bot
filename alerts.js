const tg = require('./telegram');

const channelId = process.env.MYCHAT_ID;

const alertTypes = {
    potHole: 'HAZARD_ON_ROAD_POT_HOLE'
};

function handleAlert(alert) {
    switch (alert.subtype) {
        case alertTypes.potHole:
            handlePotHoleAlert(alert);
            break;
        default:
            tg.sendUnknownAlertInfo(alert);
    }
}

function handlePotHoleAlert(alert) {
    let { reportBy, street, location } = alert;
    let who = reportBy ? reportBy : 'Хтось';

    let message = `📢 ${who} повідомляє, що на ${street} яма 😕`;

    let inlineKeyboard = {
        inline_keyboard: [
            [{
                text: 'Переглянути 🤔',
                url: getAlertUrl(location)
            }]
        ]
    }

    tg.sendMessage(channelId, message, inlineKeyboard);
}

function getAlertUrl(location) {
    return `https://www.waze.com/en/livemap/directions?latlng=${location.y}%2C${location.x}&utm_campaign=waze_website&utm_source=waze_website`;
}

exports.handleAlert = handleAlert;