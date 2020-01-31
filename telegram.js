const https = require('https');

const token = process.env.BOT_TOKEN;
const chatId = process.env.MYCHAT_ID;

const url = `https://api.telegram.org/bot${token}/`;

function sendMessage(chatId, text, inlineKeyboard) {
    let params = {
        'chat_id': chatId,
        'text': text,
        'parse_mode': 'Markdown'
    }

    if (inlineKeyboard) {
        params = Object.assign(params, { reply_markup: inlineKeyboard });
    }

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    }

    const reqUrl = url + 'sendMessage';

    const req = https.request(reqUrl, options);

    req.on('error', (e) => {
        console.error(e.message);
    });

    req.write(JSON.stringify(params));
    req.end();
}

function sendUnknownAlertInfo(alert) {
    let message = JSON.stringify(alert);
    sendMessage(chatId, message);
}

exports.sendMessage = sendMessage;
exports.sendUnknownAlertInfo = sendUnknownAlertInfo;