# Amazon Whole Foods Organic Eggs Stock Checker 🥚

**Disclaimer:** This is a personal project and is not affiliated with, endorsed by, or connected to my employer (AWS) or Amazon.com, Inc. in any way.

An intelligent web scraper that monitors Whole Foods organic egg availability on Amazon and sends email notifications when stock is found. Built with enterprise-grade reliability, anti-bot detection, and proxy rotation.

## Features

- **Stealth Browser Automation**
  - Headless Chrome powered by Playwright with anti-bot detection
  - Randomized user agents and delays to mimic human behavior
  - Proxy rotation to avoid IP blocks
  - Automatic CAPTCHA detection and retry logic

- **Robust Location Handling**
  - Automatically updates delivery location
  - Multiple selector fallbacks for UI changes
  - Keyboard navigation backup for click failures

- **Smart Stock Detection**
  - Parses product listings for organic eggs
  - Detects "Out of Stock" status across different UI patterns
  - Screenshot capture for debugging and verification

- **Notification System**
  - Email notifications via Gmail SMTP
  - Detailed product availability reports
  - Error alerts with diagnostic information

## Tech Stack

- **TypeScript** - Type safety and modern JavaScript features
- **Playwright** - Modern browser automation
- **Node.js** - Runtime environment
- **GitHub Actions** - CI/CD and scheduled runs
- **Nodemailer** - Email notifications

## Key Technical Achievements

1. **Anti-Bot Measures**
   - Implemented sophisticated browser fingerprint randomization
   - Built proxy rotation system for IP address diversity
   - Added human-like behavior patterns and delays

2. **Resilient Automation**
   - Developed multi-stage fallback mechanisms for UI interactions
   - Created comprehensive error handling and retry logic
   - Built intelligent element selection strategies

3. **Production-Grade Architecture**
   - Structured logging with rotation and error tracking
   - Environment-based configuration management
   - Modular code design for maintainability

## Learnings & Challenges

1. **Web Scraping Resilience**
   - Amazon's dynamic UI requires flexible selector strategies
   - Bot detection systems need constant adaptation
   - Proxy quality significantly impacts reliability

2. **Browser Automation**
   - Playwright offers superior stability vs Puppeteer
   - Headless browsers require careful resource management
   - Error handling needs to account for network/UI/timing issues

3. **Infrastructure**
   - GitHub Actions provides reliable scheduling
   - Proxy servers are crucial for production scraping
   - Logging is essential for debugging production issues

## Setup & Usage

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file based on `.env.example`. Required Environment Variables:
   - `PROXY_SERVER` - Proxy server URL
   - `PROXY_USERNAME` - Proxy authentication username
   - `PROXY_PASSWORD` - Proxy authentication password
   - `EMAIL_USER` - Gmail address
   - `EMAIL_APP_PASSWORD` - Gmail app-specific password
   - `NOTIFICATION_EMAIL` - Recipient email address

4. Run the script:

```bash
npm start
```

### Testing email notification:

Run the script with email testing:

```bash
npm start -- --test-email
```

## Deployment

This project is designed to run on GitHub Actions:

1. Fork this repository
2. Configure repository secrets:
   - All environment variables listed above
3. GitHub Actions will:
   - Run every 3 hours automatically
   - Can be triggered manually via workflow_dispatch
   - Install dependencies and Playwright
   - Execute the stock check
   - Send email notifications if stock is found

## Debugging

The script includes comprehensive debugging features:
- Screenshots saved on each check
- Detailed logging with Winston
- Visual browser mode for local debugging
- Error screenshots for failed location updates
