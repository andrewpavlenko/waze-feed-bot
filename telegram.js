const https = require('https');

const token = process.env.BOT_TOKEN;
const chatId = process.env.MYCHAT_ID;

const url = `https://api.telegram.org/bot${token}/`;

function sendMessage(text) {
    https.get(`${url}sendMessage?chat_id=${chatId}&text=${text}`);
}

exports.sendMessage = sendMessage;