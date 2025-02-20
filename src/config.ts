import dotenv from 'dotenv';
import { logger } from './utils/logger';

dotenv.config();

export const config = {
  URL: "https://www.amazon.com/s?k=organic+eggs&i=wholefoods",
  CHECK_INTERVAL_MIN: 180,
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

logger.info('Configuration loaded', {
  url: config.URL,
  checkIntervalMin: config.CHECK_INTERVAL_MIN,
  proxyEnabled: !!config.PROXY,
  twilioEnabled: !!config.TWILIO.ACCOUNT_SID,
  userAgentsCount: config.USER_AGENTS.length
}); 