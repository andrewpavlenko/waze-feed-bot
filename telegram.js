const https = require('https');

const token = process.env.BOT_TOKEN;
const chatId = process.env.MYCHAT_ID;

const url = `https://api.telegram.org/bot${token}/`;

function sendMessage(text) {
    const params = {
        'chat_id': chatId,
        'text': text,
        'parse_mode': 'Markdown'
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

exports.sendMessage = sendMessage;