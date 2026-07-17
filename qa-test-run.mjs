import puppeteer from 'puppeteer';

const results = {};
const consoleErrors = [];
const pageErrors = [];
const networkErrors = [];

const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function run() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // Setup monitoring
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(err.message));
  page.on('requestfailed', (req) => networkErrors.push({ url: req.url(), failure: req.failure()?.errorText }));

  // === TEST 1: App loads - landing page ===
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 15000 });
  const title = await page.title();
  const h1 = await page.$eval('h1', el => el.textContent).catch(() => 'NOT FOUND');
  results.test1_landing = { title, h1, pass: h1.includes('Value') };

  // === TEST 2: Landing page shows streams ===
  const openButtons = await page.$$eval('button, a', els =>
    els.filter(el => el.textContent.includes('Open')).length
  );
  results.test2_streams = { openButtons, pass: openButtons >= 1 };

  // === TEST 3: Performance ===
  const perf = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    return { domInteractive: Math.round(nav.domInteractive), loadComplete: Math.round(nav.loadEventEnd) };
  });
  results.test3_perf = { ...perf, pass: perf.loadComplete < 5000 };

  // === TEST 4: Open stream -> canvas renders ===
  const openLink = await page.$('a[href*="/stream/"]');
  if (openLink) {
    await openLink.click();
  } else {
    const openBtnHandle = await page.evaluateHandle(() =>
      [...document.querySelectorAll('button')].find(b => b.textContent.includes('Open'))
    );
    if (openBtnHandle.asElement()) await openBtnHandle.asElement().click();
  }
  await page.waitForSelector('.react-flow', { timeout: 5000 }).catch(() => null);
  await wait(1000);
  const url = page.url();
  const hasCanvas = await page.$('.react-flow') !== null;
  results.test4_canvas = { url, hasCanvas, pass: hasCanvas && url.includes('/stream/') };

  // === TEST 5: Canvas nodes and edges ===
  const nodeCount = await page.$$eval('.react-flow__node', els => els.length);
  const edgeCount = await page.$$eval('.react-flow__edge', els => els.length);
  results.test5_nodesEdges = { nodeCount, edgeCount, pass: nodeCount >= 5 && edgeCount >= 5 };

  // === TEST 6: Click node -> side panel opens ===
  const firstNode = await page.$('.react-flow__node');
  if (firstNode) {
    await firstNode.click();
    await wait(500);
  }
  const panelVisible = await page.evaluate(() => {
    const aside = document.querySelector('aside');
    return aside ? aside.offsetWidth > 0 : false;
  });
  results.test6_sidePanel = { panelVisible, pass: panelVisible };

  // === TEST 7: Form fields present ===
  const textareaCount = await page.$$eval('aside textarea', els => els.length);
  const inputCount = await page.$$eval('aside input', els => els.length);
  results.test7_formFields = { textareas: textareaCount, inputs: inputCount, pass: textareaCount >= 3 };

  // === TEST 8: Edit form field and verify persistence ===
  if (textareaCount > 0) {
    const testValue = 'QA_TEST_' + Date.now();
    await page.evaluate(() => {
      const ta = document.querySelector('aside textarea');
      if (ta) { ta.value = ''; ta.dispatchEvent(new Event('input', {bubbles: true})); }
    });
    await page.type('aside textarea', testValue);
    await wait(300);
    // Close panel (click somewhere on canvas)
    await page.click('.react-flow__pane');
    await wait(500);
    // Reopen
    const nodeReopen = await page.$('.react-flow__node');
    if (nodeReopen) {
      await nodeReopen.click();
      await wait(500);
    }
    const fieldValue = await page.$eval('aside textarea', el => el.value).catch(() => '');
    results.test8_persistence = { pass: fieldValue.includes('QA_TEST_') };
  } else {
    results.test8_persistence = { pass: false, reason: 'no textareas' };
  }

  // === TEST 9: Add node ===
  const nodeCountBefore = await page.$$eval('.react-flow__node', els => els.length);
  const addStepClicked = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Add Step'));
    if (btn) { btn.click(); return true; }
    return false;
  });
  await wait(500);
  const nodeCountAfter = await page.$$eval('.react-flow__node', els => els.length);
  results.test9_addNode = { before: nodeCountBefore, after: nodeCountAfter, pass: nodeCountAfter > nodeCountBefore };

  // === TEST 10: Delete node ===
  // The newly added node should have opened its panel; find delete button
  const deleteClicked = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Delete'));
    if (btn) { btn.click(); return true; }
    return false;
  });
  await wait(300);
  // Confirm delete
  const confirmClicked = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Confirm') || (b.textContent.includes('Delete') && b.className.includes('red')));
    if (btn) { btn.click(); return true; }
    return false;
  });
  await wait(500);
  const nodeCountAfterDelete = await page.$$eval('.react-flow__node', els => els.length);
  results.test10_deleteNode = { after: nodeCountAfterDelete, pass: nodeCountAfterDelete < nodeCountAfter };

  // === TEST 11: Zoom controls ===
  const controls = await page.evaluate(() => {
    const zoomIn = document.querySelector('.react-flow__controls-zoomin, button[aria-label*="zoom in"]');
    const zoomOut = document.querySelector('.react-flow__controls-zoomout, button[aria-label*="zoom out"]');
    const fitView = document.querySelector('.react-flow__controls-fitview, button[aria-label*="fit view"]');
    return { zoomIn: !!zoomIn, zoomOut: !!zoomOut, fitView: !!fitView };
  });
  results.test11_zoomControls = { ...controls, pass: controls.zoomIn && controls.zoomOut && controls.fitView };

  // === TEST 12: Dark mode toggle ===
  const htmlClassBefore = await page.evaluate(() => document.documentElement.className);
  const toggled = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => {
      const label = b.getAttribute('aria-label') || '';
      return label.toLowerCase().includes('theme') || label.toLowerCase().includes('toggle');
    });
    if (btn) { btn.click(); return true; }
    return false;
  });
  await wait(300);
  const htmlClassAfter = await page.evaluate(() => document.documentElement.className);
  results.test12_darkMode = { before: htmlClassBefore.substring(0, 20), after: htmlClassAfter.substring(0, 20), toggled, pass: toggled && htmlClassBefore !== htmlClassAfter };

  // === TEST 13: Dark mode visual - MiniMap not white ===
  const darkActive = htmlClassAfter.includes('dark');
  if (darkActive) {
    const minimapBg = await page.evaluate(() => {
      const mm = document.querySelector('.react-flow__minimap');
      return mm ? getComputedStyle(mm).backgroundColor : 'NOT FOUND';
    });
    results.test13_darkVisual = { minimapBg, pass: !minimapBg.includes('255, 255, 255') };
  } else {
    // Toggle again to get to dark
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find(b => {
        const label = b.getAttribute('aria-label') || '';
        return label.toLowerCase().includes('theme');
      });
      if (btn) btn.click();
    });
    await wait(300);
    const minimapBg = await page.evaluate(() => {
      const mm = document.querySelector('.react-flow__minimap');
      return mm ? getComputedStyle(mm).backgroundColor : 'NOT FOUND';
    });
    const nowDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    results.test13_darkVisual = { minimapBg, nowDark, pass: !minimapBg.includes('255, 255, 255') || minimapBg === 'NOT FOUND' };
  }

  // === TEST 14: Context menu ===
  const nodeForCtx = await page.$('.react-flow__node');
  if (nodeForCtx) {
    await nodeForCtx.click({ button: 'right' });
    await wait(500);
  }
  const ctxItems = await page.evaluate(() => {
    const menu = document.querySelector('[role="menu"]');
    if (!menu) return [];
    return [...menu.querySelectorAll('button, [role="menuitem"]')].map(e => e.textContent.trim());
  });
  results.test14_contextMenu = { items: ctxItems.slice(0, 6), pass: ctxItems.length >= 2 };
  // Dismiss
  await page.keyboard.press('Escape');
  await wait(200);

  // === TEST 15: Auto-layout button ===
  const hasAutoLayout = await page.evaluate(() => {
    return !!([...document.querySelectorAll('button')].find(b =>
      b.textContent.includes('Auto') || (b.getAttribute('aria-label') || '').includes('layout')
    ));
  });
  results.test15_autoLayout = { found: hasAutoLayout, pass: hasAutoLayout };

  // === TEST 16: Undo/Redo ===
  const hasUndo = await page.evaluate(() =>
    !!([...document.querySelectorAll('button')].find(b => (b.getAttribute('aria-label') || '').includes('Undo')))
  );
  const hasRedo = await page.evaluate(() =>
    !!([...document.querySelectorAll('button')].find(b => (b.getAttribute('aria-label') || '').includes('Redo')))
  );
  results.test16_undoRedo = { undo: hasUndo, redo: hasRedo, pass: hasUndo && hasRedo };

  // === TEST 17: Export/Import ===
  const hasExport = await page.evaluate(() =>
    !!([...document.querySelectorAll('button')].find(b => (b.getAttribute('aria-label') || '').toLowerCase().includes('export') || b.textContent.includes('Export')))
  );
  const hasImport = await page.evaluate(() =>
    !!([...document.querySelectorAll('button')].find(b => (b.getAttribute('aria-label') || '').toLowerCase().includes('import') || b.textContent.includes('Import')))
  );
  results.test17_exportImport = { export: hasExport, import: hasImport, pass: hasExport && hasImport };

  // === TEST 18: Node palette ===
  const paletteItems = await page.$$eval('[draggable="true"]', els => els.length);
  results.test18_palette = { items: paletteItems, pass: paletteItems >= 2 };

  // === TEST 19: Connection handles ===
  const handleCount = await page.$$eval('.react-flow__handle', els => els.length);
  const currentNodes = await page.$$eval('.react-flow__node', els => els.length);
  results.test19_handles = { handles: handleCount, nodes: currentNodes, pass: handleCount >= currentNodes };

  // === TEST 20: Form accessibility ===
  const a11y = await page.evaluate(() => {
    const aside = document.querySelector('aside');
    if (!aside) return { total: 0, labeled: 0, unlabeled: 0 };
    const fields = aside.querySelectorAll('input, textarea');
    let labeled = 0, unlabeled = 0;
    fields.forEach(f => {
      const id = f.id;
      const hasLabel = id && document.querySelector(`label[for="${id}"]`);
      const hasAria = f.getAttribute('aria-label') || f.getAttribute('aria-labelledby');
      if (hasLabel || hasAria) labeled++; else unlabeled++;
    });
    return { total: fields.length, labeled, unlabeled };
  });
  results.test20_a11y = { ...a11y, pass: a11y.unlabeled === 0 };

  // === TEST 21: Save indicator ===
  const hasSaveIndicator = await page.evaluate(() => {
    return !!document.body.textContent.match(/Saved|Saving/);
  });
  results.test21_save = { found: hasSaveIndicator, pass: hasSaveIndicator };

  // === TEST 22: Back navigation button ===
  const hasBackBtn = await page.evaluate(() => {
    return !!([...document.querySelectorAll('button, a')].find(e =>
      e.textContent.includes('Back') || (e.getAttribute('aria-label') || '').includes('Back')
    ));
  });
  results.test22_backNav = { found: hasBackBtn, pass: hasBackBtn };

  // === TEST 23: Responsive 768px ===
  await page.setViewport({ width: 768, height: 1024 });
  await wait(500);
  const overflow768 = await page.evaluate(() => ({
    bodyScrollWidth: document.body.scrollWidth,
    viewportWidth: window.innerWidth,
    hasOverflow: document.body.scrollWidth > window.innerWidth
  }));
  results.test23_responsive768 = { ...overflow768, pass: !overflow768.hasOverflow };

  // === TEST 24: Responsive 640px ===
  await page.setViewport({ width: 640, height: 900 });
  await wait(500);
  const overflow640 = await page.evaluate(() => ({
    bodyScrollWidth: document.body.scrollWidth,
    viewportWidth: window.innerWidth,
    hasOverflow: document.body.scrollWidth > window.innerWidth
  }));
  results.test24_responsive640 = { ...overflow640, pass: !overflow640.hasOverflow };

  // === TEST 25: Navigate back to landing page ===
  await page.setViewport({ width: 1920, height: 1080 });
  const backBtnClicked = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button, a')].find(e =>
      e.textContent.includes('Back') || (e.getAttribute('aria-label') || '').includes('Back')
    );
    if (btn) { btn.click(); return true; }
    return false;
  });
  await wait(1000);
  const finalUrl = page.url();
  results.test25_backToLanding = { url: finalUrl, pass: finalUrl.endsWith('/') || finalUrl === 'http://localhost:5173/' };

  // === TEST 26: Create stream dialog ===
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  await wait(300);
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Create') || b.textContent.includes('New'));
    if (btn) btn.click();
  });
  await wait(500);
  const dialogCheck = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    if (!d) return { found: false };
    return {
      found: true,
      ariaModal: d.getAttribute('aria-modal'),
      ariaLabelledby: d.getAttribute('aria-labelledby'),
    };
  });
  results.test26_createDialog = { ...dialogCheck, pass: dialogCheck.found && dialogCheck.ariaModal === 'true' };

  // === TEST 27: Second stream loads ===
  await page.keyboard.press('Escape');
  await wait(300);
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  const allLinks = await page.$$('a[href*="/stream/"]');
  if (allLinks.length >= 2) {
    await allLinks[1].click();
    await page.waitForSelector('.react-flow', { timeout: 5000 }).catch(() => null);
    await wait(1000);
  }
  const sdlcNodes = await page.$$eval('.react-flow__node', els => els.length);
  results.test27_secondStream = { nodes: sdlcNodes, pass: sdlcNodes >= 10 };

  // === TEST 28: Search panel ===
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  const openFirst = await page.$('a[href*="/stream/"]');
  if (openFirst) await openFirst.click();
  await page.waitForSelector('.react-flow', { timeout: 5000 }).catch(() => null);
  await wait(500);
  const hasSearch = await page.evaluate(() => {
    return !!([...document.querySelectorAll('button')].find(b =>
      (b.getAttribute('aria-label') || '').toLowerCase().includes('search') ||
      b.textContent.includes('Search') || b.textContent.includes('Ctrl+F')
    ));
  });
  results.test28_search = { found: hasSearch, pass: hasSearch };

  // === ERRORS SUMMARY ===
  results.errors = {
    consoleErrors: consoleErrors.length,
    details: consoleErrors.slice(0, 10),
    pageErrors: pageErrors.length,
    pageDetails: pageErrors.slice(0, 5),
    networkErrors: networkErrors.length,
    networkDetails: networkErrors.slice(0, 5)
  };

  // Summary
  const allTests = Object.entries(results).filter(([k]) => k.startsWith('test'));
  const passed = allTests.filter(([, v]) => v.pass).length;
  const failed = allTests.filter(([, v]) => !v.pass).map(([k, v]) => ({ test: k, detail: v }));
  results.summary = { total: allTests.length, passed, failed };

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
}

run().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
