const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: { width: 1440, height: 900 }
    });

    const page = await browser.newPage();
    const screenshotDir = path.join(__dirname, '../screenshots');

    if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir);
    }

    try {
        console.log('Taking Dashboard screenshot...');
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
        // Wait for some data to load or skeleton to disappear if possible, though networkidle0 should handle it.
        await new Promise(r => setTimeout(r, 2000));
        await page.screenshot({ path: path.join(screenshotDir, 'dashboard.png') });

        console.log('Taking Admin screenshot...');
        // Set cookie for simple auth (based on observed code)
        // Note: The actual auth implementation might check value, but usually just presence or specific value "true" or token. 
        // Let's assume standard 'admin_auth' cookie based on previous file views.
        // Actually, looking at previous turn, login sets a cookie. I'll check if I need to POST to login first.
        // To be safe, I'll just try to login via UI interaction.
        await page.goto('http://localhost:3000/admin/login', { waitUntil: 'networkidle0' });
        await page.type('input[type="password"]', 'admin'); // Default password
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        await new Promise(r => setTimeout(r, 2000));
        await page.screenshot({ path: path.join(screenshotDir, 'admin.png') });

    } catch (error) {
        console.error('Error taking screenshots:', error);
    } finally {
        await browser.close();
        console.log('Done.');
    }
})();
