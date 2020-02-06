/* eslint-disable consistent-return */
/* eslint-disable default-case */
const tg = require('./telegram');

const channelId = process.env.CHANNEL_ID;

const alertTypes = {
  chitChat: 'CHIT_CHAT',
  police: 'POLICE',
  policeman: 'POLICEMAN',
  jam: 'JAM',
  accident: 'ACCIDENT',
};

const alertSubTypes = {
  potHole: 'HAZARD_ON_ROAD_POT_HOLE',
  construction: 'HAZARD_ON_ROAD_CONSTRUCTION',
  hazard: 'HAZARD_ON_ROAD',
  objectOnRoad: 'HAZARD_ON_ROAD_OBJECT',
  killedAnimal: 'HAZARD_ON_ROAD_ROAD_KILL',
  shoulderAnimals: 'HAZARD_ON_SHOULDER_ANIMALS',
};

function handleAlert(alert) {
  switch (alert.type) {
    case alertTypes.chitChat:
      return handleChitChat(alert);
    case alertTypes.police:
    case alertTypes.policeman:
      return handlePoliceAlert(alert);
    case alertTypes.jam:
      return handleJamAlert(alert);
    case alertTypes.accident:
      return handleAccidentAlert(alert);
  }

  switch (alert.subtype) {
    case alertSubTypes.potHole:
      return handlePotHoleAlert(alert);
    case alertSubTypes.construction:
      return handleConstructionAlert(alert);
    case alertSubTypes.hazard:
      return handleHazardAlert(alert);
    case alertSubTypes.objectOnRoad:
      return handleObjectOnRoadAlert(alert);
    case alertSubTypes.killedAnimal:
      return handleKilledAnimalAlert(alert);
    case alertSubTypes.shoulderAnimals:
      return handleShoulderAnimalsAlert(alert);
    default:
      tg.sendUnknownAlertInfo(alert);
  }
}

function handleAccidentAlert(alert) {
  sendAlertMessage(alert, 'аварія 🚙💥🚕');
}

function handleJamAlert(alert) {
  sendAlertMessage(alert, 'затор 🚗🚕🚙');
}

function handlePoliceAlert(alert) {
  sendAlertMessage(alert, 'поліція 🚓');
}

function handleShoulderAnimalsAlert(alert) {
  sendAlertMessage(alert, 'поблизу тварини 🐄🐑🐕');
}

function handleKilledAnimalAlert(alert) {
  sendAlertMessage(alert, 'збита тваринка 😥');
}

function handleObjectOnRoadAlert(alert) {
  sendAlertMessage(alert, 'перешкода 🌲');
}

function handleChitChat(alert) {
  let { reportBy, location } = alert;
  let who = reportBy || 'Хтось';

  let message = `📢 ${who} залишив коментар на мапі 💭`;
  let inlineKeyboard = buildLinkReplyKeyboard(location);

  tg.sendMessage(channelId, message, inlineKeyboard);
}

function handleHazardAlert(alert) {
  sendAlertMessage(alert, 'небезпека 💣');
}

function handleConstructionAlert(alert) {
  sendAlertMessage(alert, 'ремонт дороги 🚧');
}

function handlePotHoleAlert(alert) {
  sendAlertMessage(alert, 'яма 😑');
}

function sendAlertMessage(alert, messageEnding) {
  let { reportBy, street, city, location } = alert;
  let who = reportBy || 'Хтось';
  let where;
  if (street) {
    where = `на ${street}`;
  } else if (city) {
    where = `у м. ${city}`;
  } else {
    where = 'десь';
  }

  let message = `📢 ${who} повідомляє, що ${where} ${messageEnding}`;
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
        url: getAlertUrl(location),
      }],
    ],
  };
  return inlineKeyboard;
}

exports.handleAlert = handleAlert;
