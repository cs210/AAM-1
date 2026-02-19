const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto('http://localhost:8081', { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(3000);
    const text = await page.evaluate(() => document.body.innerText);
    await browser.close();
    if (text.includes('Something went wrong') || text.includes("reading 'useRef')")) {
      console.error('FAIL: Error still present in page:', text.slice(0, 500));
      process.exit(1);
    }
    console.log('OK: No error screen. Page preview:', text.slice(0, 300));
    process.exit(0);
  } catch (e) {
    await browser.close();
    console.error('FAIL:', e.message);
    process.exit(1);
  }
})();
