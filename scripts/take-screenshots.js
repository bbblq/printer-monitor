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

    const maskIPs = async (page) => {
        await page.evaluate(() => {
            const replaceIP = (text) => text.replace(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g, '192.168.x.xxx');

            // Dashboard Cards
            document.querySelectorAll('.font-mono').forEach(el => {
                if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(el.innerText)) {
                    el.innerText = replaceIP(el.innerText);
                    el.style.filter = 'blur(1px)'; // Add subtle blur for effect
                }
            });

            // Admin Table
            document.querySelectorAll('td.font-mono').forEach(el => {
                if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(el.innerText)) {
                    el.innerText = replaceIP(el.innerText);
                    el.style.filter = 'blur(1px)';
                }
            });
        });
    };

    try {
        console.log('Taking Dashboard screenshot...');
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
        await new Promise(r => setTimeout(r, 2000));
        await maskIPs(page);
        await page.screenshot({ path: path.join(screenshotDir, 'dashboard.png') });

        console.log('Taking Admin screenshot...');
        await page.goto('http://localhost:3000/admin/login', { waitUntil: 'networkidle0' });
        await page.type('input[type="password"]', 'admin');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        await new Promise(r => setTimeout(r, 2000));
        await maskIPs(page);
        await page.screenshot({ path: path.join(screenshotDir, 'admin.png') });

        console.log('Taking History screenshot...');
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
        // Click the first history button (using title attribute selector)
        const historyBtnSelector = 'button[title="查看更换记录"]';
        await page.waitForSelector(historyBtnSelector, { timeout: 5000 }).catch(() => console.log('No printers found for history screenshot'));

        if (await page.$(historyBtnSelector)) {
            await page.click(historyBtnSelector);
            // Wait for modal to appear (it has a transparent backdrop)
            await new Promise(r => setTimeout(r, 1000));
            // Screenshot specifically the modal if possible, or just the whole page with modal open
            // Let's grab the whole page for context
            await page.screenshot({ path: path.join(screenshotDir, 'history.png') });
        }

    } catch (error) {
        console.error('Error taking screenshots:', error);
    } finally {
        await browser.close();
        console.log('Done.');
    }
})();
