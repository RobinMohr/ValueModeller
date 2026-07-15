const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/stream/demo-stream', { waitUntil: 'networkidle0' });
  const navElements = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a')).map(l => ({ text: l.innerText.trim().substring(0, 50), href: l.getAttribute('href') }));
    const buttons = Array.from(document.querySelectorAll('button')).map(b => ({ text: b.innerText.trim().substring(0, 50), ariaLabel: b.getAttribute('aria-label') }));
    return { links, buttons: buttons.filter(b => b.text || b.ariaLabel) };
  });
  console.log('Links:', JSON.stringify(navElements.links, null, 2));
  console.log('Buttons (first 20):', JSON.stringify(navElements.buttons.slice(0, 20), null, 2));
  await browser.close();
})();
