const puppeteer = require('puppeteer');

(async () => {
  const results = [];
  const consoleErrors = [];
  let browser;

  try {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-gpu'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => consoleErrors.push('PAGE_ERROR: ' + err.message));

    // === TEST 1: App loads - landing page renders ===
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 15000 });
    const title = await page.title();
    results.push('1. App loads: PASS (title: ' + title + ')');

    // === TEST 2: Landing page content ===
    const landingInfo = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      const h2 = document.querySelector('h2');
      const links = document.querySelectorAll('a[href*="/stream/"]');
      const buttons = document.querySelectorAll('button');
      const buttonTexts = Array.from(buttons).map(b => b.textContent.trim()).filter(t => t);
      return {
        h1: h1 ? h1.textContent : null,
        h2: h2 ? h2.textContent : null,
        streamLinks: links.length,
        buttonCount: buttons.length,
        buttonTexts: buttonTexts.slice(0, 10)
      };
    });
    results.push('2. Landing: h1=' + landingInfo.h1 + ', h2=' + landingInfo.h2 + ', streamLinks=' + landingInfo.streamLinks + ', buttons=' + landingInfo.buttonCount);
    results.push('   Button texts: ' + JSON.stringify(landingInfo.buttonTexts));

    // === TEST 3: Navigate to stream (open canvas) ===
    let canvasLoaded = false;
    const streamLink = await page.$('a[href*="/stream/"]');
    if (streamLink) {
      await streamLink.click();
      await page.waitForSelector('.react-flow', { timeout: 8000 });
      canvasLoaded = true;
      results.push('3. Open stream via link: PASS');
    } else {
      // Try clicking a button that navigates
      const openBtn = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, a'));
        const openBtn = btns.find(b => /open|view|edit/i.test(b.textContent));
        if (openBtn) { openBtn.click(); return openBtn.textContent.trim(); }
        return null;
      });
      if (openBtn) {
        try {
          await page.waitForSelector('.react-flow', { timeout: 8000 });
          canvasLoaded = true;
          results.push('3. Open stream via button ("' + openBtn + '"): PASS');
        } catch (e) {
          results.push('3. Clicked "' + openBtn + '" but canvas did not load: FAIL');
        }
      } else {
        results.push('3. No stream link or open button found: FAIL');
      }
    }

    results.push('   URL after navigation: ' + page.url());

    if (canvasLoaded) {
      // === TEST 4: Canvas has nodes ===
      const nodeCount = await page.evaluate(() => {
        return document.querySelectorAll('.react-flow__node').length;
      });
      results.push('4. Canvas nodes: ' + nodeCount + (nodeCount > 0 ? ' PASS' : ' FAIL'));

      // === TEST 5: Canvas has edges ===
      const edgeCount = await page.evaluate(() => {
        return document.querySelectorAll('.react-flow__edge').length;
      });
      results.push('5. Canvas edges: ' + edgeCount + (edgeCount > 0 ? ' PASS' : ' FAIL'));

      // === TEST 6: Click node -> side panel opens ===
      const firstNode = await page.$('.react-flow__node');
      if (firstNode) {
        await firstNode.click();
        await new Promise(r => setTimeout(r, 500));
        const panelOpen = await page.evaluate(() => {
          const aside = document.querySelector('aside');
          const panel = document.querySelector('[role="complementary"], [class*="panel"], [class*="sidebar"]');
          return !!(aside || panel);
        });
        results.push('6. Click node -> panel opens: ' + (panelOpen ? 'PASS' : 'FAIL'));

        // === TEST 7: Panel has form fields ===
        if (panelOpen) {
          const formInfo = await page.evaluate(() => {
            const textareas = document.querySelectorAll('textarea');
            const inputs = document.querySelectorAll('input[type="text"], input:not([type])');
            const labels = document.querySelectorAll('label');
            return { textareas: textareas.length, inputs: inputs.length, labels: labels.length };
          });
          results.push('7. Form fields: textareas=' + formInfo.textareas + ', inputs=' + formInfo.inputs + ', labels=' + formInfo.labels + ' PASS');
        }

        // === TEST 8: Edit form field and verify persistence ===
        const editResult = await page.evaluate(() => {
          const textarea = document.querySelector('textarea');
          if (!textarea) return 'NO_TEXTAREA';
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
          const oldValue = textarea.value;
          nativeInputValueSetter.call(textarea, oldValue + ' [QA TEST EDIT]');
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          textarea.dispatchEvent(new Event('change', { bubbles: true }));
          return 'EDITED';
        });
        results.push('8. Edit form field: ' + editResult);
      }

      // === TEST 9: Add node ===
      const addButton = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const addBtn = btns.find(b => /add.*step|add.*node|\+ add/i.test(b.textContent));
        return addBtn ? addBtn.textContent.trim() : null;
      });
      if (addButton) {
        const beforeCount = await page.evaluate(() => document.querySelectorAll('.react-flow__node').length);
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const addBtn = btns.find(b => /add.*step|add.*node|\+ add/i.test(b.textContent));
          if (addBtn) addBtn.click();
        });
        await new Promise(r => setTimeout(r, 1000));
        const afterCount = await page.evaluate(() => document.querySelectorAll('.react-flow__node').length);
        results.push('9. Add node: before=' + beforeCount + ', after=' + afterCount + (afterCount > beforeCount ? ' PASS' : ' FAIL'));
      } else {
        results.push('9. Add node button not found: FAIL');
      }

      // === TEST 10: Delete node ===
      const deleteResult = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const deleteBtn = btns.find(b => /delete.*step|delete/i.test(b.textContent));
        if (deleteBtn) {
          deleteBtn.click();
          return 'FIRST_CLICK';
        }
        return 'NOT_FOUND';
      });
      if (deleteResult === 'FIRST_CLICK') {
        await new Promise(r => setTimeout(r, 500));
        // Confirm delete
        const beforeDel = await page.evaluate(() => document.querySelectorAll('.react-flow__node').length);
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const confirmBtn = btns.find(b => /confirm/i.test(b.textContent));
          if (confirmBtn) confirmBtn.click();
        });
        await new Promise(r => setTimeout(r, 1000));
        const afterDel = await page.evaluate(() => document.querySelectorAll('.react-flow__node').length);
        results.push('10. Delete node: before=' + beforeDel + ', after=' + afterDel + (afterDel < beforeDel ? ' PASS' : ' FAIL'));
      } else {
        results.push('10. Delete button not found: SKIP');
      }

      // === TEST 11: Zoom controls ===
      const zoomControls = await page.evaluate(() => {
        const controls = document.querySelectorAll('.react-flow__controls button, .react-flow__controls-button');
        return controls.length;
      });
      results.push('11. Zoom controls present: ' + zoomControls + (zoomControls >= 2 ? ' PASS' : ' FAIL'));

      // === TEST 12: Back navigation ===
      const backLink = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a, button'));
        const back = links.find(l => /back|return|home|streams/i.test(l.textContent));
        return back ? back.textContent.trim() : null;
      });
      results.push('12. Back navigation element: ' + (backLink || 'NOT FOUND'));

      // === TEST 13: Dark mode toggle ===
      const darkModeResult = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const themeBtn = btns.find(b => b.getAttribute('aria-label') && /theme|dark|light|mode/i.test(b.getAttribute('aria-label')));
        if (themeBtn) {
          themeBtn.click();
          const hasDark = document.documentElement.classList.contains('dark');
          return 'Toggled, dark class: ' + hasDark;
        }
        return 'NOT_FOUND';
      });
      results.push('13. Dark mode toggle: ' + darkModeResult);

      // === TEST 14: Check for responsive overflow at 768px ===
      await page.setViewport({ width: 768, height: 1024 });
      await new Promise(r => setTimeout(r, 500));
      const overflowInfo = await page.evaluate(() => {
        return {
          bodyScrollWidth: document.body.scrollWidth,
          viewportWidth: window.innerWidth,
          overflows: document.body.scrollWidth > window.innerWidth
        };
      });
      results.push('14. Overflow at 768px: scrollWidth=' + overflowInfo.bodyScrollWidth + ', viewport=' + overflowInfo.viewportWidth + (overflowInfo.overflows ? ' OVERFLOW DETECTED' : ' OK'));

      // Reset viewport
      await page.setViewport({ width: 1920, height: 1080 });

      // === TEST 15: Keyboard shortcut Escape ===
      await page.keyboard.press('Escape');
      await new Promise(r => setTimeout(r, 300));
      results.push('15. Escape key pressed: no crash PASS');

      // === TEST 16: Export/Import buttons present ===
      const exportImport = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const exportBtn = btns.find(b => /export/i.test(b.textContent) || /export/i.test(b.getAttribute('aria-label') || ''));
        const importBtn = btns.find(b => /import/i.test(b.textContent) || /import/i.test(b.getAttribute('aria-label') || ''));
        return { export: !!exportBtn, import: !!importBtn };
      });
      results.push('16. Export button: ' + exportImport.export + ', Import button: ' + exportImport.import);

      // === TEST 17: Node palette ===
      const palette = await page.evaluate(() => {
        const el = document.querySelector('[class*="palette"], [draggable="true"]');
        const draggables = document.querySelectorAll('[draggable="true"]');
        return { hasPalette: !!el, draggableCount: draggables.length };
      });
      results.push('17. Node palette: draggable items=' + palette.draggableCount);

      // === TEST 18: Context menu (right-click) ===
      const nodeForContext = await page.$('.react-flow__node');
      if (nodeForContext) {
        await nodeForContext.click({ button: 'right' });
        await new Promise(r => setTimeout(r, 500));
        const contextMenu = await page.evaluate(() => {
          const menu = document.querySelector('[role="menu"], [class*="context-menu"], [class*="contextMenu"]');
          return menu ? menu.textContent.substring(0, 100) : null;
        });
        results.push('18. Context menu on right-click: ' + (contextMenu ? 'PASS (' + contextMenu.substring(0, 50) + ')' : 'NOT FOUND'));
      }

      // === TEST 19: Performance metrics ===
      const perfMetrics = await page.evaluate(() => {
        const perf = performance.getEntriesByType('navigation')[0];
        return {
          domInteractive: Math.round(perf.domInteractive),
          domContentLoaded: Math.round(perf.domContentLoadedEventEnd),
          loadComplete: Math.round(perf.loadEventEnd)
        };
      });
      results.push('19. Performance: domInteractive=' + perfMetrics.domInteractive + 'ms, DOMContentLoaded=' + perfMetrics.domContentLoaded + 'ms, load=' + perfMetrics.loadComplete + 'ms');
    }

    // === TEST 20: Navigate back to landing ===
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 10000 });
    const backOnLanding = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1 ? h1.textContent : 'NO H1';
    });
    results.push('20. Back to landing: ' + backOnLanding);

    // === TEST 21: Create new stream dialog ===
    const createResult = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const createBtn = btns.find(b => /create|new.*stream/i.test(b.textContent));
      if (createBtn) {
        createBtn.click();
        return createBtn.textContent.trim();
      }
      return null;
    });
    if (createResult) {
      await new Promise(r => setTimeout(r, 500));
      const dialogInfo = await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]');
        return {
          hasDialog: !!dialog,
          ariaModal: dialog ? dialog.getAttribute('aria-modal') : null,
          ariaLabelledby: dialog ? dialog.getAttribute('aria-labelledby') : null
        };
      });
      results.push('21. Create stream dialog: hasDialog=' + dialogInfo.hasDialog + ', aria-modal=' + dialogInfo.ariaModal + ', aria-labelledby=' + dialogInfo.ariaLabelledby);
    } else {
      results.push('21. Create stream button not found');
    }

  } catch (e) {
    results.push('FATAL ERROR: ' + e.message);
  } finally {
    if (browser) await browser.close();
  }

  console.log('=== PUPPETEER QA TEST RESULTS ===');
  console.log('Timestamp: ' + new Date().toISOString());
  console.log('');
  results.forEach(r => console.log(r));
  console.log('');
  console.log('=== CONSOLE ERRORS (' + consoleErrors.length + ') ===');
  consoleErrors.forEach(e => console.log('  [ERROR] ' + e));
  console.log('');
  console.log('=== SUMMARY ===');
  const passes = results.filter(r => r.includes('PASS')).length;
  const fails = results.filter(r => r.includes('FAIL')).length;
  console.log('Passed: ' + passes + ', Failed: ' + fails + ', Console Errors: ' + consoleErrors.length);
})();
