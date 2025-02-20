# **Product Requirements Document (PRD): Headless Browser Stock Checker with CAPTCHA Avoidance**  
*Version 1.0*  

---

## **1. Overview**  
### **Objective**  
Build a TypeScript-based tool using **Playwright/Puppeteer** with stealth plugins to monitor Amazon’s Whole Foods organic eggs page, avoid CAPTCHAs, and send alerts when items are in stock.  

### **Key Features**  
- Headless browser automation with human-like behavior.  
- CAPTCHA avoidance via stealth plugins and IP rotation.  
- SMS/email notifications when stock is detected.  
- Configurable check intervals and retry logic.  

---

## **2. Requirements**  
### **Technical Requirements**  
| Component           | Details                                                                 |  
|---------------------|-----------------------------------------------------------------------|  
| **Language**        | TypeScript                                                           |  
| **Browser Engine**  | Playwright (recommended) or Puppeteer with `puppeteer-extra` plugins |  
| **Stealth Plugins** | `puppeteer-extra-plugin-stealth`, `playwright-stealth`               |  
| **Proxies**         | Rotating residential proxies (e.g., Bright Data, Oxylabs)            |  
| **Notifications**   | Twilio (SMS) or Nodemailer (email)                                   |  

---

## **3. Architecture**  
### **Components**  
1. **Stealth Browser Instance**  
   - Launches headless Chrome/Firefox with randomized fingerprints.  
   - Uses plugins to hide automation traces (e.g., WebDriver flags, headless detection).  
2. **Monitoring Logic**  
   - Navigates to the Amazon URL, checks for "Add to Cart" buttons.  
3. **Notification Manager**  
   - Triggers alerts via SMS/email when stock is detected.  
4. **Configuration**  
   - Proxy rotation, check intervals, and user-agent lists.  

### **Workflow**  
1. Initialize stealth browser with proxies.  
2. Navigate to the Amazon product page.  
3. Check for "Add to Cart" text or buttons.  
4. If in stock → send alert.  
5. If CAPTCHA detected → retry with new IP or notify.  

---

## **4. Implementation**  
### **Step 1: Setup**  
```bash
npm init -y
npm install playwright playwright-extra playwright-stealth twilio nodemailer
npm install -D typescript @types/node ts-node
```

### **Step 2: Configuration (`config.ts`)**  
```typescript
export const config = {
  URL: "https://www.amazon.com/s?k=organic+eggs&i=wholefoods",
  CHECK_INTERVAL_MIN: 5,
  PROXY: "http://user:pass@proxy-ip:port", // From proxy service
  TWILIO: {
    ACCOUNT_SID: "your_sid",
    AUTH_TOKEN: "your_token",
    FROM_NUMBER: "+1234567890",
    TO_NUMBER: "+0987654321",
  },
  USER_AGENTS: [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
  ],
};
```

### **Step 3: Core Code (`monitor.ts`)**  
```typescript
import { chromium } from "playwright-extra";
import stealth from "playwright-stealth";
import { config } from "./config";
import Twilio from "twilio";

// Apply stealth plugins
chromium.use(stealth);

const twilioClient = Twilio(config.TWILIO.ACCOUNT_SID, config.TWILIO.AUTH_TOKEN);

async function checkStock() {
  const browser = await chromium.launch({
    headless: true,
    proxy: { server: config.PROXY }, // Rotate proxies here
  });

  const context = await browser.newContext({
    userAgent: config.USER_AGENTS[Math.floor(Math.random() * config.USER_AGENTS.length)],
  });

  const page = await context.newPage();
  await page.goto(config.URL, { waitUntil: "networkidle" });

  // Check for "Add to Cart"
  const isInStock = await page.$('text="Add to Cart"');
  await browser.close();
  return !!isInStock;
}

async function sendSms() {
  await twilioClient.messages.create({
    body: "Organic Eggs are IN STOCK!",
    from: config.TWILIO.FROM_NUMBER,
    to: config.TWILIO.TO_NUMBER,
  });
}

(async () => {
  while (true) {
    try {
      const inStock = await checkStock();
      if (inStock) {
        await sendSms();
        break; // Stop after alerting
      }
    } catch (error) {
      console.error("Error:", error);
      // Rotate proxy/retry logic here
    }
    await new Promise((resolve) =>
      setTimeout(resolve, config.CHECK_INTERVAL_MIN * 60 * 1000)
    );
  }
})();
```

---

## **5. CAPTCHA Handling Strategies**  
### **Avoidance Techniques**  
- **Randomized Delays**: Add human-like pauses between actions.  
  ```typescript
  await page.waitForTimeout(Math.random() * 5000 + 1000); // 1–6s delay
  ```  
- **Proxy Rotation**: Use a pool of residential proxies to mask IPs.  
- **Mouse Movements**: Simulate realistic mouse trajectories.  
  ```typescript
  await page.mouse.move(100, 200);
  await page.mouse.click(100, 200); // Click instead of direct navigation
  ```  

### **If CAPTCHA Appears**  
1. **Automated Retry**:  
   - Close the browser, switch proxies, and retry.  
2. **Manual Intervention (Fallback)**:  
   - Send a notification prompting the user to solve the CAPTCHA.  

---

## **6. Testing Plan**  
| Test Case               | Expected Outcome                     |  
|-------------------------|-------------------------------------|  
| **Stealth Mode**         | No CAPTCHA detected for 24 hours.   |  
| **Proxy Rotation**       | IP changes between checks.          |  
| **Stock Detection**      | SMS sent when "Add to Cart" exists. |  
| **CAPTCHA Fallback**     | Alert sent to user for manual solve.|  

---

## **7. Deployment**  
### **Option 1: Local Machine**  
- Run via PM2 for background process:  
  ```bash
  pm2 start --interpreter=ts-node --name egg-monitor monitor.ts
  ```  

### **Option 2: Cloud Server**  
- Use AWS EC2 or DigitalOcean with cron jobs.  

---

## **8. Maintenance**  
- **HTML Selector Updates**: Adjust code if Amazon changes page structure.  
- **Proxy Health Checks**: Monitor and replace blocked proxies.  

---

## **9. Risks**  
| Risk                   | Mitigation                              |  
|------------------------|----------------------------------------|  
| **IP Ban**             | Use high-quality residential proxies.  |  
| **Legal Issues**       | Check Amazon’s ToS; use sparingly.     |  
| **CAPTCHA Arms Race**  | Integrate CAPTCHA services as fallback.|  

---

## **10. Deliverables**  
1. Source code with TypeScript setup.  
2. Proxy configuration guide.  
3. SMS/email alert integration docs.  

---

**Timeline**: 3–5 days (depending on proxy/notification setup).  
**Cost**: ~$50/month (proxies + Twilio credits).