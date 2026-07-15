/**
 * QA Agent — Debug script to understand app state
 */
import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:5173';

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // Navigate to landing page
  await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 15000 });

  // Debug: what's on the landing page
  const landingDebug = await page.evaluate(() => {
    const html = document.body.innerHTML.substring(0, 3000);
    const allButtons = Array.from(document.querySelectorAll('button')).map(b => ({
      text: b.textContent?.trim(),
      class: b.className.substring(0, 60),
      ariaLabel: b.getAttribute('aria-label')
    }));
    const allLinks = Array.from(document.querySelectorAll('a')).map(a => ({
      text: a.textContent?.trim().substring(0, 50),
      href: a.getAttribute('href')
    }));
    const h1 = document.querySelector('h1')?.textContent;
    const h2s = Array.from(document.querySelectorAll('h2')).map(h => h.textContent);
    return { html, allButtons, allLinks, h1, h2s, url: window.location.href };
  });
  console.log('=== LANDING PAGE DEBUG ===');
  console.log('URL:', landingDebug.url);
  console.log('H1:', landingDebug.h1);
  console.log('H2s:', landingDebug.h2s);
  console.log('Buttons:', JSON.stringify(landingDebug.allButtons, null, 2));
  console.log('Links:', JSON.stringify(landingDebug.allLinks, null, 2));
  console.log('HTML (first 2000):', landingDebug.html.substring(0, 2000));

  // Navigate to canvas: try clicking the first stream card
  const clickResult = await page.evaluate(() => {
    // Try clicking anything that looks like a stream card
    const allClickable = document.querySelectorAll('a, button, [role="button"], [class*="card"]');
    const results = [];
    for (const el of allClickable) {
      results.push({
        tag: el.tagName,
        text: el.textContent?.trim()?.substring(0, 50),
        href: el.getAttribute('href'),
        class: el.className?.substring?.(0, 50) || ''
      });
    }
    return results;
  });
  console.log('\n=== ALL CLICKABLE ELEMENTS ===');
  console.log(JSON.stringify(clickResult.slice(0, 20), null, 2));

  // Click first link that goes to /stream
  const streamLink = clickResult.find(el => el.href && el.href.includes('/stream'));
  if (streamLink) {
    console.log('\nNavigating to stream:', streamLink.href);
    await page.goto(`${BASE_URL}${streamLink.href}`, { waitUntil: 'networkidle0', timeout: 10000 });
  } else {
    // Click the first card-like element
    console.log('\nNo stream link found, trying to click first card...');
    await page.evaluate(() => {
      const cards = document.querySelectorAll('[class*="card"], [role="button"]');
      if (cards.length > 0) cards[0].click();
    });
    await new Promise(r => setTimeout(r, 2000));
  }

  // Debug canvas state
  const canvasDebug = await page.evaluate(() => {
    const url = window.location.href;
    const reactFlow = document.querySelector('.react-flow');
    const nodes = document.querySelectorAll('.react-flow__node');
    const edges = document.querySelectorAll('.react-flow__edge');
    const panel = document.querySelector('.react-flow__panel');
    const minimap = document.querySelector('.react-flow__minimap');
    const controls = document.querySelector('.react-flow__controls');
    const allButtons = Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim()).filter(Boolean);
    const allDraggables = document.querySelectorAll('[draggable="true"]');
    return {
      url,
      hasReactFlow: !!reactFlow,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      hasPanels: !!panel,
      hasMinimap: !!minimap,
      hasControls: !!controls,
      buttonTexts: allButtons,
      draggableCount: allDraggables.length,
    };
  });
  console.log('\n=== CANVAS DEBUG ===');
  console.log(JSON.stringify(canvasDebug, null, 2));

  // If we're on canvas, click first node and check panel
  if (canvasDebug.nodeCount > 0) {
    await page.evaluate(() => {
      const node = document.querySelector('.react-flow__node');
      if (node) node.click();
    });
    await new Promise(r => setTimeout(r, 500));
    
    const panelDebug = await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('label')).map(l => l.textContent?.trim());
      const textareas = document.querySelectorAll('textarea');
      const inputs = document.querySelectorAll('input');
      const panels = document.querySelectorAll('[role="complementary"], [class*="panel"], aside');
      return {
        labels,
        textareaCount: textareas.length,
        inputCount: inputs.length,
        panelCount: panels.length,
      };
    });
    console.log('\n=== PANEL DEBUG (after node click) ===');
    console.log(JSON.stringify(panelDebug, null, 2));
  }

  await browser.close();
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
