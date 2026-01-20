const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

(async () => {
    // Check if server is running; if not, you might need to handle that or assume it's running (since USER ran `npm run dev`)
    // We will assume http://localhost:3000 is accessible.

    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: { width: 1400, height: 900 }
    });

    const page = await browser.newPage();

    // Screenshot 1: Dashboard
    console.log('Navigating to dashboard...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

    // Wait for data to load (if async)
    await new Promise(r => setTimeout(r, 2000));

    const screenshotsDir = path.join(__dirname, '../screenshots');
    if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir);
    }

    console.log('Taking dashboard screenshot...');
    await page.screenshot({ path: path.join(screenshotsDir, 'dashboard.png') });

    // Screenshot 2: Admin
    // Need to login first or access directly if no auth check on page load (admin usually has check)
    // Actually, let's just nav to /admin/login explicitly, fill, and go.
    console.log('Navigating to admin login...');
    await page.goto('http://localhost:3000/admin/login', { waitUntil: 'networkidle0' });

    // Wait for inputs
    await page.waitForSelector('input[type="password"]');
    await page.type('input[type="password"]', 'admin'); // Default password assumption
    await page.click('button[type="submit"]'); // Adjust selector if needed

    await page.waitForNavigation({ waitUntil: 'networkidle0' });

    console.log('Taking admin screenshot...');
    await page.screenshot({ path: path.join(screenshotsDir, 'admin.png') });

    // Screenshot 3: History Modal/Page (Example)
    // We can just screenshot the admin page again or omit detailed history for now if not easily accessible.
    // The previous README had history.png. Let's try to grab a history view for first printer.
    // Selector for history button in first row: table tr:first-child button[title="更换记录"]
    try {
        const historyBtn = await page.$('tbody tr:first-child button[title="更换记录"]');
        if (historyBtn) {
            await historyBtn.click();
            await page.waitForNavigation({ waitUntil: 'networkidle0' });
            console.log('Taking history screenshot...');
            await page.screenshot({ path: path.join(screenshotsDir, 'history.png') });
        }
    } catch (e) {
        console.log('Could not take history screenshot:', e.message);
    }

    await browser.close();
    console.log('Screenshots updated.');
})();
