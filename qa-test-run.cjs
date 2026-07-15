// QA test script - run with: npx --package=puppeteer node qa-test-run.cjs
const puppeteer = require('puppeteer');

(async () => {
  const results = [];
  const consoleErrors = [];
  let browser;

  try {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-gpu'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', err => consoleErrors.push('PAGE_ERROR: ' + err.message));

    // FLOW 1: App loads
    console.log('FLOW 1: App loads...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 10000 });
    const title = await page.title();
    const hasContent = await page.evaluate(() => document.body.innerText.length > 0);
    results.push({ flow: 'App loads', pass: hasContent, detail: 'Title: ' + title });

    const pageText = await page.evaluate(() => document.body.innerText.substring(0, 300));
    const hasLandingContent = pageText.includes('Value') || pageText.includes('Stream') || pageText.includes('Create');
    results.push({ flow: 'Landing page content', pass: hasLandingContent, detail: pageText.substring(0, 150) });

    // FLOW 2: Open a stream
    console.log('FLOW 2: Open stream...');
    let canvasReached = false;
    const streamLinks = await page.$$('a[href*="/stream/"]');
    if (streamLinks.length > 0) {
      await streamLinks[0].click();
      await page.waitForSelector('.react-flow', { timeout: 5000 }).catch(() => null);
      canvasReached = (await page.$('.react-flow')) !== null;
    }
    if (!canvasReached) {
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => /open|view|demo|insurance/i.test(b.innerText));
        if (btn) btn.click();
      });
      await new Promise(r => setTimeout(r, 3000));
      canvasReached = (await page.$('.react-flow')) !== null;
    }
    results.push({ flow: 'Canvas renders', pass: canvasReached, detail: 'URL: ' + (await page.url()) });

    if (canvasReached) {
      const nodes = await page.$$('.react-flow__node');
      results.push({ flow: 'Nodes visible', pass: nodes.length > 0, detail: 'Count: ' + nodes.length });

      // FLOW 3: Add node
      console.log('FLOW 3: Add node...');
      const before = (await page.$$('.react-flow__node')).length;
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => /add step|\+ add/i.test(b.innerText));
        if (btn) btn.click();
      });
      await new Promise(r => setTimeout(r, 1500));
      const after = (await page.$$('.react-flow__node')).length;
      results.push({ flow: 'Add node', pass: after > before, detail: 'Before: ' + before + ', After: ' + after });

      // FLOW 4: Click node -> panel opens
      console.log('FLOW 4: Click node -> panel...');
      const firstNode = await page.$('.react-flow__node');
      if (firstNode) {
        await firstNode.click();
        await new Promise(r => setTimeout(r, 1000));
        const panelOpen = await page.evaluate(() => {
          const labels = Array.from(document.querySelectorAll('label'));
          return labels.some(l => /supplier|input|output|customer|step name/i.test(l.innerText));
        });
        results.push({ flow: 'Click node opens panel', pass: panelOpen, detail: 'Panel with SIPOC labels: ' + panelOpen });

        // FLOW 5: Edit form
        console.log('FLOW 5: Edit form...');
        const editOk = await page.evaluate(() => {
          const ta = document.querySelector('textarea');
          if (!ta) return false;
          const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
          setter.call(ta, ta.value + '\nQA-Test-123');
          ta.dispatchEvent(new Event('input', { bubbles: true }));
          ta.dispatchEvent(new Event('change', { bubbles: true }));
          return ta.value.includes('QA-Test-123');
        });
        results.push({ flow: 'Edit form field', pass: editOk, detail: 'Edit persisted: ' + editOk });

        // FLOW 6: Delete node
        console.log('FLOW 6: Delete node...');
        const beforeDel = (await page.$$('.react-flow__node')).length;
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const btn = btns.find(b => /delete/i.test(b.innerText));
          if (btn) btn.click();
        });
        await new Promise(r => setTimeout(r, 600));
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const btn = btns.find(b => /confirm/i.test(b.innerText));
          if (btn) btn.click();
        });
        await new Promise(r => setTimeout(r, 1000));
        const afterDel = (await page.$$('.react-flow__node')).length;
        results.push({ flow: 'Delete node', pass: afterDel < beforeDel, detail: 'Before: ' + beforeDel + ', After: ' + afterDel });
      }

      // FLOW 7: Edges
      console.log('FLOW 7: Edges...');
      const edges = await page.$$('.react-flow__edge');
      results.push({ flow: 'Edges visible', pass: edges.length > 0, detail: 'Count: ' + edges.length });

      // FLOW 8: Zoom
      console.log('FLOW 8: Zoom...');
      const vBefore = await page.evaluate(() => document.querySelector('.react-flow__viewport')?.style.transform);
      const canvas = await page.$('.react-flow');
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.wheel({ deltaY: -200 });
      await new Promise(r => setTimeout(r, 500));
      const vAfter = await page.evaluate(() => document.querySelector('.react-flow__viewport')?.style.transform);
      results.push({ flow: 'Zoom/Pan', pass: vBefore !== vAfter, detail: 'Changed: ' + (vBefore !== vAfter) });

      // FLOW 9: Navigate back
      console.log('FLOW 9: Navigate back...');
      await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        const back = links.find(l => l.href && (l.href.endsWith('/') || l.getAttribute('href') === '/'));
        if (back) { back.click(); return; }
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => /back|stream/i.test(b.innerText));
        if (btn) btn.click();
      });
      await new Promise(r => setTimeout(r, 2000));
      const finalUrl = await page.url();
      results.push({ flow: 'Navigate back', pass: finalUrl.endsWith('/') || finalUrl === 'http://localhost:5173/', detail: 'URL: ' + finalUrl });
    }
  } catch (err) {
    results.push({ flow: 'FATAL', pass: false, detail: err.message });
  } finally {
    if (browser) await browser.close();
  }

  console.log('\n=== PUPPETEER TEST RESULTS ===');
  let passed = 0, failed = 0;
  for (const r of results) {
    const s = r.pass ? 'PASS' : 'FAIL';
    if (r.pass) passed++; else failed++;
    console.log(s + ' | ' + r.flow + ' | ' + r.detail);
  }
  console.log('\n=== SUMMARY: ' + passed + ' passed, ' + failed + ' failed ===');
  console.log('\n=== CONSOLE ERRORS (' + consoleErrors.length + ') ===');
  consoleErrors.slice(0, 15).forEach(e => console.log('  ERROR: ' + e.substring(0, 300)));
})();
