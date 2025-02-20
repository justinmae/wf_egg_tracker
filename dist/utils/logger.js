"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class Logger {
    constructor() {
        this.logsDir = path_1.default.join(process.cwd(), 'logs');
        if (!fs_1.default.existsSync(this.logsDir)) {
            fs_1.default.mkdirSync(this.logsDir);
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        this.logFile = path_1.default.join(this.logsDir, `log_${timestamp}.txt`);
    }
    formatMessage(level, message, data) {
        const timestamp = new Date().toISOString();
        const dataStr = data ? `\nData: ${JSON.stringify(data, null, 2)}` : '';
        return `[${timestamp}] ${level}: ${message}${dataStr}\n`;
    }
    writeToFile(message) {
        fs_1.default.appendFileSync(this.logFile, message);
    }
    info(message, data) {
        const formattedMessage = this.formatMessage('INFO', message, data);
        console.log(formattedMessage);
        this.writeToFile(formattedMessage);
    }
    error(message, error) {
        const errorData = error instanceof Error ?
            { message: error.message, stack: error.stack } :
            error;
        const formattedMessage = this.formatMessage('ERROR', message, errorData);
        console.error(formattedMessage);
        this.writeToFile(formattedMessage);
    }
    debug(message, data) {
        const formattedMessage = this.formatMessage('DEBUG', message, data);
        console.debug(formattedMessage);
        this.writeToFile(formattedMessage);
    }
    getLogsDir() {
        return this.logsDir;
    }
}
exports.logger = new Logger();
