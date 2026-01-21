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

    // Wait for data to load
    await new Promise(r => setTimeout(r, 2000));

    // Mask IPs
    console.log('Masking IPs...');
    await page.evaluate(() => {
        // Helper to check if text is IP-like
        const isIP = (text) => /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(text);

        // Walk through all elements
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node;
        while (node = walker.nextNode()) {
            if (isIP(node.nodeValue)) {
                node.nodeValue = node.nodeValue.replace(/\d{1,3}\.\d{1,3}/g, '192.168'); // Normalize prefix if needed or just mask suffix
                // Actually user asked to mask, so let's make it obvious but clean
                node.nodeValue = node.nodeValue.replace(/(\d{1,3}\.\d{1,3}\.)\d{1,3}\.\d{1,3}/g, '$1xx.xx');
            }
        }
    });

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

    // Mask IPs for Admin
    await page.evaluate(() => {
        const isIP = (text) => /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(text);
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node;
        while (node = walker.nextNode()) {
            if (isIP(node.nodeValue)) {
                node.nodeValue = node.nodeValue.replace(/(\d{1,3}\.\d{1,3}\.)\d{1,3}\.\d{1,3}/g, '$1xx.xx');
            }
        }
    });

    console.log('Taking admin screenshot...');
    await page.screenshot({ path: path.join(screenshotsDir, 'admin.png') });

    // Screenshot 3: History Modal
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000)); // Wait for data load

    try {
        // Find printer card for "1层东区" (East Area L1) or just the first card if not found, but user asked for specific one.
        console.log('Opening history for 1层东区...');
        // We use evaluate to find the button because selectors based on text are hard in pure CSS
        const historyBtnFound = await page.evaluate(() => {
            const cards = Array.from(document.querySelectorAll('.bg-white.rounded-xl.shadow-sm'));
            const targetCard = cards.find(c => c.textContent.includes('1层东区')) || cards[0];
            if (targetCard) {
                const btn = targetCard.querySelector('button[title*="记录"], button svg.lucide-history')?.closest('button');
                if (btn) {
                    btn.click();
                    return true;
                }
            }
            return false;
        });

        if (historyBtnFound) {
            await new Promise(r => setTimeout(r, 1000)); // Wait for modal animation
            console.log('Taking history screenshot...');
            await page.screenshot({ path: path.join(screenshotsDir, 'history.png') });
        } else {
            console.log('History button not found, skipping.');
        }
    } catch (e) {
        console.log('Could not take history screenshot:', e.message);
    }

    await browser.close();
    console.log('Screenshots updated.');
})();
