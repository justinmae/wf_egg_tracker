"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const playwright_extra_1 = require("playwright-extra");
const playwright_extra_2 = require("playwright-extra");
const puppeteer_extra_plugin_stealth_1 = __importDefault(require("puppeteer-extra-plugin-stealth"));
const config_1 = require("./config");
const logger_1 = require("./utils/logger");
const path_1 = __importDefault(require("path"));
const nodemailer_1 = __importDefault(require("nodemailer"));
// import Twilio from 'twilio';
// Apply stealth plugins
const browser = (0, playwright_extra_2.addExtra)(playwright_extra_1.chromium);
browser.use((0, puppeteer_extra_plugin_stealth_1.default)());
if (!process.env.PROXY_SERVER || !process.env.PROXY_USERNAME || !process.env.PROXY_PASSWORD) {
    throw new Error('Missing proxy configuration in environment variables');
}
// Comment out SendGrid validation
// if (!process.env.SENDGRID_API_KEY) {
//   throw new Error('Missing SendGrid API key in environment variables');
// }
// sgMail.setApiKey(process.env.SENDGRID_API_KEY);
// Create Nodemailer transporter
const transporter = nodemailer_1.default.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD // Use Gmail App Password
    }
});
const PROXY = {
    server: process.env.PROXY_SERVER,
    username: process.env.PROXY_USERNAME,
    password: process.env.PROXY_PASSWORD
};
async function sendEmailNotification(availableProducts) {
    const productList = availableProducts
        .map(product => `• ${product.title}`)
        .join('\n');
    const msg = {
        from: process.env.EMAIL_USER,
        to: process.env.NOTIFICATION_EMAIL,
        subject: 'Organic Eggs in Stock!',
        text: `The following organic eggs are currently in stock:\n\n${productList}`,
        html: `
      <h2>Organic Eggs in Stock!</h2>
      <p>The following organic eggs are currently in stock:</p>
      <ul>
        ${availableProducts.map(product => `<li>${product.title}</li>`).join('')}
      </ul>
    `
    };
    try {
        await transporter.sendMail(msg);
        logger_1.logger.info('Stock notification email sent successfully');
    }
    catch (error) {
        logger_1.logger.error('Error sending email notification', error);
        throw error;
    }
}
async function updateLocation(page) {
    let successfully_updated_location = false;
    const update_location_max_tries = 2;
    for (let i = 0; i < update_location_max_tries && !successfully_updated_location; i++) {
        try {
            const locationButton = await page.$([
                'input[data-action-type="UPDATE_LOCATION"]',
                'span[data-action-type="SELECT_LOCATION"]',
                '#glow-ingress-block',
                '[data-csa-c-content-id="nav-global-location-popover-link"]'
            ].join(','));
            if (!locationButton)
                continue;
            await page.waitForTimeout(2000);
            await locationButton.click();
            logger_1.logger.info('Clicked Update location button');
            await page.waitForTimeout(2000);
            await page.waitForSelector('#GLUXZipUpdateInput', { timeout: 3000 });
            await page.type('#GLUXZipUpdateInput', '11030');
            await page.click('#GLUXZipUpdate');
            logger_1.logger.info('Updated zip code to 11030');
            await page.waitForTimeout(2000);
            const doneButtonSelectors = [
                '#GLUXConfirmClose',
                '[data-action="GLUXConfirmClose"]',
                'input[aria-labelledby="GLUXConfirmClose-announce"]',
                'button:has-text("Done")',
                'span:has-text("Done")',
                '[aria-label="Done"]',
                '[role="button"]:has-text("Done")'
            ];
            let clicked = false;
            for (const selector of doneButtonSelectors) {
                if (await page.isVisible(selector)) {
                    await page.click(selector);
                    clicked = true;
                    logger_1.logger.info('Clicked Done button');
                    break;
                }
            }
            if (!clicked) {
                await page.keyboard.press('Tab');
                await page.keyboard.press('Tab');
                await page.keyboard.press('Enter');
                logger_1.logger.info('Used keyboard navigation to click Done');
            }
            await page.waitForTimeout(3000);
            await page.reload({ waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(2000);
            const locationText = await page.$eval('#glow-ingress-line2', (el) => el.textContent);
            logger_1.logger.info('Current location shown as:', { location: locationText });
            successfully_updated_location = true;
        }
        catch (error) {
            logger_1.logger.debug('Failed to update location', error);
            const errorScreenshot = path_1.default.join(logger_1.logger.getLogsDir(), `location_update_error_${new Date().toISOString().replace(/[:.]/g, '-')}.png`);
            await page.screenshot({ path: errorScreenshot });
        }
    }
    return successfully_updated_location;
}
async function checkStock() {
    logger_1.logger.info('Starting stock check', { proxy: config_1.config.PROXY ? 'enabled' : 'disabled' });
    let retryCount = 0;
    const maxRetries = 1;
    while (retryCount < maxRetries) {
        const browser = await playwright_extra_1.chromium.launch({
            headless: false,
            args: [
                '--disable-blink-features=AutomationControlled',
                '--disable-features=IsolateOrigins,site-per-process',
            ],
            proxy: PROXY
        });
        const selectedUserAgent = config_1.config.USER_AGENTS[Math.floor(Math.random() * config_1.config.USER_AGENTS.length)];
        logger_1.logger.debug('Created browser context', { userAgent: selectedUserAgent });
        const context = await browser.newContext({
            userAgent: selectedUserAgent,
            viewport: { width: 1920, height: 1080 },
            deviceScaleFactor: 1,
            hasTouch: false,
            isMobile: false,
            javaScriptEnabled: true,
        });
        const page = await context.newPage();
        try {
            logger_1.logger.debug('Navigating to URL', { url: config_1.config.URL });
            await page.goto(config_1.config.URL, {
                waitUntil: 'domcontentloaded',
                timeout: 60000
            });
            await updateLocation(page);
            if (await page.$('input[name="captcha"]')) {
                throw new Error('Bot detection encountered');
            }
            await page.waitForSelector('[data-component-type="s-search-result"]', { timeout: 30000 });
            await page.waitForTimeout(Math.random() * 3000 + 2000);
            const products = await page.$$('[data-component-type="s-search-result"]');
            const results = [];
            for (const product of products) {
                const titleElement = await product.$('.a-text-normal');
                const title = await titleElement?.textContent() || 'Unknown Product';
                if (!title.toLowerCase().includes('organic') || !title.toLowerCase().includes('eggs')) {
                    continue;
                }
                const outOfStock = await product.$('text=/currently unavailable|out of stock/i');
                const status = outOfStock ? 'OUT_OF_STOCK' : 'AVAILABLE';
                results.push({ title, status });
                logger_1.logger.info('Product status', { title, status });
            }
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const screenshotPath = path_1.default.join(logger_1.logger.getLogsDir(), `screenshot_${timestamp}.png`);
            await page.screenshot({ path: screenshotPath });
            logger_1.logger.debug('Saved debug screenshot', { path: screenshotPath });
            const availableProducts = results.filter(r => r.status === 'AVAILABLE');
            return { hasStock: availableProducts.length > 0, availableProducts };
        }
        catch (error) {
            logger_1.logger.error('Error during stock check', error);
            retryCount++;
            if (retryCount < maxRetries) {
                logger_1.logger.info(`Retrying... (Attempt ${retryCount + 1} of ${maxRetries})`);
                await page.waitForTimeout(5000 * retryCount);
            }
            else {
                throw error;
            }
        }
        finally {
            await browser.close();
            logger_1.logger.debug('Browser closed');
        }
    }
    throw new Error('Max retries exceeded');
}
// async function sendSms() {
//   logger.info('Sending SMS notification');
//   await twilioClient.messages.create({
//     body: "Organic Eggs are IN STOCK!",
//     from: config.TWILIO.FROM_NUMBER,
//     to: config.TWILIO.TO_NUMBER,
//   });
//   logger.info('SMS notification sent successfully');
// }
async function testEmailNotification() {
    logger_1.logger.info('Testing email notification');
    const testProducts = [
        { title: "Organic Valley, Organic Free-Range Large Brown Eggs", status: 'AVAILABLE' },
        { title: "Pete and Gerry's Organic Eggs, Large, Free Range", status: 'AVAILABLE' }
    ];
    try {
        await sendEmailNotification(testProducts);
        logger_1.logger.info('Test email sent successfully');
    }
    catch (error) {
        logger_1.logger.error('Test email failed', error);
        throw error;
    }
}
async function main() {
    logger_1.logger.info('Starting stock monitor', {
        checkIntervalMin: config_1.config.CHECK_INTERVAL_MIN
    });
    while (true) {
        try {
            const { hasStock, availableProducts } = await checkStock();
            if (hasStock) {
                logger_1.logger.info('Stock found!', { availableProducts });
                await sendEmailNotification(availableProducts);
                break;
            }
            logger_1.logger.info('No stock found, waiting for next check', {
                nextCheckInMinutes: config_1.config.CHECK_INTERVAL_MIN
            });
        }
        catch (error) {
            logger_1.logger.error('Error in main loop', error);
        }
        await new Promise(resolve => setTimeout(resolve, config_1.config.CHECK_INTERVAL_MIN * 60 * 1000));
    }
}
// Add test command line argument check
if (process.argv.includes('--test-email')) {
    testEmailNotification().catch(error => {
        logger_1.logger.error('Email test failed', error);
        process.exit(1);
    });
}
else {
    main().catch(error => logger_1.logger.error('Fatal error in main', error));
}
