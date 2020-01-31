function info(info) {
    let date = new Date();
    let message = `[${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}] ${info}`;

    console.log('\x1b[35m%s\x1b[0m', message);
}

exports.info = info;