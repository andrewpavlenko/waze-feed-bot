const tg = require('./telegram');

const channelId = process.env.CHANNEL_ID;

const alertTypes = {
    potHole: 'HAZARD_ON_ROAD_POT_HOLE',
    construction: 'HAZARD_ON_ROAD_CONSTRUCTION',
    hazard: 'HAZARD_ON_ROAD'
};

function handleAlert(alert) {
    switch (alert.subtype) {
        case alertTypes.potHole:
            return handlePotHoleAlert(alert);
        case alertTypes.construction:
            return handleConstructionAlert(alert);
        case alertTypes.hazard:
            return handleHazardAlert(alert);
        default:
            tg.sendUnknownAlertInfo(alert);
    }
}

function handleHazardAlert(alert) {
    let { reportBy, street, city, location } = alert;
    let who = reportBy ? reportBy : 'Хтось';
    let where = street ? `на ${street}` : `у м. ${city}`;

    let message = `📢 ${who} повідомляє, що ${where} небезпека 💣`;
    let inlineKeyboard = buildLinkReplyKeyboard(location);

    tg.sendMessage(channelId, message, inlineKeyboard);
}

function handleConstructionAlert(alert) {
    let { reportBy, street, city, location } = alert;
    let who = reportBy ? reportBy : 'Хтось';
    let where = street ? `на ${street}` : `у м. ${city}`;

    let message = `📢 ${who} повідомляє, що ${where} ремонт дороги 🚧`;
    let inlineKeyboard = buildLinkReplyKeyboard(location);

    tg.sendMessage(channelId, message, inlineKeyboard);
}

function handlePotHoleAlert(alert) {
    let { reportBy, street, city, location } = alert;
    let who = reportBy ? reportBy : 'Хтось';
    let where = street ? `на ${street}` : `у м. ${city}`;

    let message = `📢 ${who} повідомляє, що ${where} яма 🙂`;
    let inlineKeyboard = buildLinkReplyKeyboard(location);

    tg.sendMessage(channelId, message, inlineKeyboard);
}

function getAlertUrl(location) {
    return `https://www.waze.com/en/livemap/directions?latlng=${location.y}%2C${location.x}&utm_campaign=waze_website&utm_source=waze_website`;
}

function buildLinkReplyKeyboard(location) {
    let inlineKeyboard = {
        inline_keyboard: [
            [{
                text: 'Переглянути 🗺️',
                url: getAlertUrl(location)
            }]
        ]
    };
    return inlineKeyboard;
}

exports.handleAlert = handleAlert;