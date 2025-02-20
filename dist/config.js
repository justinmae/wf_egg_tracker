"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = require("./utils/logger");
dotenv_1.default.config();
exports.config = {
    URL: "https://www.amazon.com/s?k=organic+eggs&i=wholefoods",
    CHECK_INTERVAL_MIN: 5,
    PROXY: undefined,
    TWILIO: {
        ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
        AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
        FROM_NUMBER: process.env.TWILIO_FROM_NUMBER,
        TO_NUMBER: process.env.TWILIO_TO_NUMBER,
    },
    USER_AGENTS: [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    ],
};
logger_1.logger.info('Configuration loaded', {
    url: exports.config.URL,
    checkIntervalMin: exports.config.CHECK_INTERVAL_MIN,
    proxyEnabled: !!exports.config.PROXY,
    twilioEnabled: !!exports.config.TWILIO.ACCOUNT_SID,
    userAgentsCount: exports.config.USER_AGENTS.length
});
