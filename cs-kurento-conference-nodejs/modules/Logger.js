var fs = require("fs");
var path = require("path");
var winston = require("winston");
var logsDir = path.join(__dirname, '../logs');
var infoLogFilePath = path.join(logsDir, 'info.log');
var errorLogFilePath = path.join(logsDir, 'errors.log');

class Logger {
    constructor(){
        if (!fs.existsSync(logsDir)){
            fs.mkdirSync(logsDir);
        }
        if (!fs.existsSync(infoLogFilePath)) {
            fs.openSync(infoLogFilePath, 'a');
        }
        if (!fs.existsSync(errorLogFilePath)) {
            fs.openSync(errorLogFilePath, 'a');
        }

        this.infoLogger = new (winston.Logger)({
            level: 'info',
            transports: [
                new (winston.transports.Console)(),
                new (winston.transports.File)({
                    json: false,
                    filename: infoLogFilePath
                })
            ]
        });

        this.errorLogger = new (winston.Logger)({
            level: 'error',
            transports: [
                new (winston.transports.Console)(),
                new (winston.transports.File)({
                    json: false,
                    filename: errorLogFilePath
                })
            ]
        });
    }
    info(message='', data={}){
        message = message.replace(/\n|\s{2,}/g,' ');
        this.infoLogger.log("info", message, data);
    }
    error(message='', data={}){
        message = message.replace(/\n|\s{2,}/g,' ');
        this.errorLogger.log("error", message, data);
    }
}

module.exports = new Logger();