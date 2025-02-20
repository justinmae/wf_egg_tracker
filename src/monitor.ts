import 'dotenv/config';
import { chromium } from 'playwright-extra';
import { addExtra } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { config } from './config';
import { logger } from './utils/logger';
import path from 'path';
import { Page, ElementHandle } from 'playwright';
import nodemailer from 'nodemailer';
// import Twilio from 'twilio';

// Apply stealth plugins
const browser = addExtra(chromium);
browser.use(StealthPlugin());

if (!process.env.PROXY_SERVER || !process.env.PROXY_USERNAME || !process.env.PROXY_PASSWORD || !process.env.ZIP_CODE) {
  throw new Error('Missing required environment variables');
}

// Comment out SendGrid validation
// if (!process.env.SENDGRID_API_KEY) {
//   throw new Error('Missing SendGrid API key in environment variables');
// }
// sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Create Nodemailer transporter
const transporter = nodemailer.createTransport({
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

// const twilioClient = new Twilio(config.TWILIO.ACCOUNT_SID, config.TWILIO.AUTH_TOKEN);

interface Product {
  title: string;
  status: 'AVAILABLE' | 'OUT_OF_STOCK';
}

async function sendEmailNotification(availableProducts: Product[]) {
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
    logger.info('Stock notification email sent successfully');
  } catch (error) {
    logger.error('Error sending email notification', error);
    throw error;
  }
}

async function updateLocation(page: Page): Promise<boolean> {
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

      if (!locationButton) continue;

      await page.waitForTimeout(2000);
      await locationButton.click();
      logger.info('Clicked Update location button');
      await page.waitForTimeout(2000);

      await page.waitForSelector('#GLUXZipUpdateInput', { timeout: 3000 });
      await page.type('#GLUXZipUpdateInput', process.env.ZIP_CODE || '');
      await page.click('#GLUXZipUpdate');
      logger.info('Updated zip code to ' + process.env.ZIP_CODE);
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
          logger.info('Clicked Done button');
          break;
        }
      }

      if (!clicked) {
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Enter');
        logger.info('Used keyboard navigation to click Done');
      }

      await page.waitForTimeout(3000);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const locationText = await page.$eval('#glow-ingress-line2', (el: HTMLElement) => el.textContent);
      logger.info('Current location shown as:', { location: locationText });
      successfully_updated_location = true;
    } catch (error) {
      logger.debug('Failed to update location', error);
      const errorScreenshot = path.join(logger.getLogsDir(), `location_update_error_${new Date().toISOString().replace(/[:.]/g, '-')}.png`);
      await page.screenshot({ path: errorScreenshot });
    }
  }
  return successfully_updated_location;
}

async function checkStock() {
  logger.info('Starting stock check', { proxy: config.PROXY ? 'enabled' : 'disabled' });
  
  let retryCount = 0;
  const maxRetries = 1;
  
  while (retryCount < maxRetries) {
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
      proxy: PROXY
    });

    const selectedUserAgent = config.USER_AGENTS[Math.floor(Math.random() * config.USER_AGENTS.length)];
    logger.debug('Created browser context', { userAgent: selectedUserAgent });

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
      logger.debug('Navigating to URL', { url: config.URL });
      await page.goto(config.URL, { 
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
      const results: Product[] = [];

      for (const product of products) {
        const titleElement = await product.$('.a-text-normal');
        const title = await titleElement?.textContent() || 'Unknown Product';
        
        if (!title.toLowerCase().includes('organic') || !title.toLowerCase().includes('eggs')) {
          continue;
        }
        
        const outOfStock = await product.$('text=/currently unavailable|out of stock/i');
        const status = outOfStock ? 'OUT_OF_STOCK' : 'AVAILABLE';
        results.push({ title, status });
        logger.info('Product status', { title, status });
      }
    
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const screenshotPath = path.join(logger.getLogsDir(), `screenshot_${timestamp}.png`);
      await page.screenshot({ path: screenshotPath });
      logger.debug('Saved debug screenshot', { path: screenshotPath });

      const availableProducts = results.filter(r => r.status === 'AVAILABLE');
      return { hasStock: availableProducts.length > 0, availableProducts };
    } catch (error) {
      logger.error('Error during stock check', error);
      retryCount++;
      if (retryCount < maxRetries) {
        logger.info(`Retrying... (Attempt ${retryCount + 1} of ${maxRetries})`);
        await page.waitForTimeout(5000 * retryCount);
      } else {
        throw error;
      }
    } finally {
      await browser.close();
      logger.debug('Browser closed');
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
  logger.info('Testing email notification');
  const testProducts: Product[] = [
    { title: "Organic Valley, Organic Free-Range Large Brown Eggs", status: 'AVAILABLE' },
    { title: "Pete and Gerry's Organic Eggs, Large, Free Range", status: 'AVAILABLE' }
  ];

  try {
    await sendEmailNotification(testProducts);
    logger.info('Test email sent successfully');
  } catch (error) {
    logger.error('Test email failed', error);
    throw error;
  }
}

async function main() {
  logger.info('Starting stock monitor');
  
  try {
    const { hasStock, availableProducts } = await checkStock();
    if (hasStock) {
      logger.info('Stock found!', { availableProducts });
      await sendEmailNotification(availableProducts);
    } else {
      logger.info('No stock found');
    }
  } catch (error) {
    logger.error('Error in main loop', error);
    process.exit(1); // Exit with error code
  }
  
  process.exit(0); // Exit successfully
}

// Add test command line argument check
if (process.argv.includes('--test-email')) {
  testEmailNotification().catch(error => {
    logger.error('Email test failed', error);
    process.exit(1);
  });
} else {
  main().catch(error => logger.error('Fatal error in main', error));
} 