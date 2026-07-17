import puppeteer from 'puppeteer';
const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function run() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // Test A: Dark mode class application
  await page.goto('http://localhost:5173/stream/demo-stream', { waitUntil: 'networkidle0' });
  await wait(1000);
  
  const darkModeCheck = await page.evaluate(() => {
    const before = document.documentElement.className;
    const btn = [...document.querySelectorAll('button')].find(b => {
      const label = (b.getAttribute('aria-label') || '').toLowerCase();
      return label.includes('theme') || label.includes('dark') || label.includes('light');
    });
    const btnLabel = btn ? (btn.getAttribute('aria-label') || btn.textContent.trim()) : 'NOT FOUND';
    if (btn) btn.click();
    return { before, btnLabel };
  });
  await wait(500);
  const afterClass = await page.evaluate(() => document.documentElement.className);
  // Toggle again to verify cycling
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => {
      const label = (b.getAttribute('aria-label') || '').toLowerCase();
      return label.includes('theme') || label.includes('dark') || label.includes('light');
    });
    if (btn) btn.click();
  });
  await wait(500);
  const afterSecondToggle = await page.evaluate(() => document.documentElement.className);

  console.log('=== DARK MODE TEST ===');
  console.log(JSON.stringify({ before: darkModeCheck.before, btnLabel: darkModeCheck.btnLabel, after1: afterClass, after2: afterSecondToggle }));

  // Test B: Second stream via direct URL
  console.log('\n=== SECOND STREAM TEST ===');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  await wait(500);
  const streamLinks = await page.$$eval('a[href*="/stream/"]', els => els.map(e => ({ href: e.href, text: e.textContent.trim() })));
  console.log('Stream links:', JSON.stringify(streamLinks));
  
  if (streamLinks.length >= 2) {
    await page.goto(streamLinks[1].href, { waitUntil: 'networkidle0' });
    await wait(2000);
    const sdlcNodes = await page.$$eval('.react-flow__node', els => els.length);
    const sdlcEdges = await page.$$eval('.react-flow__edge', els => els.length);
    console.log('SDLC stream: nodes=' + sdlcNodes + ' edges=' + sdlcEdges);
  } else {
    console.log('Only ' + streamLinks.length + ' stream links found');
  }

  // Test C: Search functionality
  console.log('\n=== SEARCH TEST ===');
  await page.goto('http://localhost:5173/stream/demo-stream', { waitUntil: 'networkidle0' });
  await wait(1000);
  
  // Check all buttons for search-related items
  const allButtons = await page.evaluate(() => {
    return [...document.querySelectorAll('button')].map(b => ({
      text: b.textContent.trim().substring(0, 60),
      ariaLabel: b.getAttribute('aria-label'),
      classes: b.className.substring(0, 80)
    }));
  });
  console.log('All buttons on canvas page:', JSON.stringify(allButtons, null, 2));
  
  // Try Ctrl+F
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyF');
  await page.keyboard.up('Control');
  await wait(800);
  
  const afterCtrlF = await page.evaluate(() => {
    const inputs = [...document.querySelectorAll('input')].filter(i => i.offsetWidth > 0);
    return inputs.map(i => ({ placeholder: i.placeholder, type: i.type, id: i.id, visible: i.offsetWidth > 0 }));
  });
  console.log('Inputs visible after Ctrl+F:', JSON.stringify(afterCtrlF));

  // Test D: Responsive 375px (mobile)
  console.log('\n=== MOBILE 375px TEST ===');
  await page.setViewport({ width: 375, height: 812 });
  await wait(500);
  const overflow375 = await page.evaluate(() => ({
    bodyScrollWidth: document.body.scrollWidth,
    viewportWidth: window.innerWidth,
    hasOverflow: document.body.scrollWidth > window.innerWidth
  }));
  console.log('375px overflow:', JSON.stringify(overflow375));

  await browser.close();
}
run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
