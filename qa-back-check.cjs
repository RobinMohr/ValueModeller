const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/stream/demo-stream', { waitUntil: 'networkidle0' });
  
  // Click the back button using aria-label
  await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label="Back to value streams"]');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 2000));
  const url = await page.url();
  console.log('After clicking back button, URL:', url);
  console.log('Back navigation works:', url === 'http://localhost:5173/' || url.endsWith('/'));
  
  await browser.close();
})();
