import { chromium } from 'playwright';

async function testMisaInspect() {
  const url = 'https://www.meinvoice.vn/tra-cuu/?sc=XAF7FGQANN05&m=vlxdtinthinh@gmail.com;info@habico.vn&n=CÔNG';
  console.log('Testing MISA URL:', url);

  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  
  const context = await browser.newContext({
    acceptDownloads: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  });
  
  const page = await context.newPage();

  try {
    console.log('Navigating to MISA URL...');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('Waiting 8 seconds for page to render...');
    await page.waitForTimeout(8000);

    // Capture initial screenshot
    await page.screenshot({ path: 'd:/Dashboard/server/downloads/misa_initial.png' });
    console.log('Initial screenshot saved.');

    // Query for any element containing "Tải hóa đơn"
    const elements = await page.$$('div, span, a, button, li');
    console.log(`Found ${elements.length} elements of types div, span, a, button, li.`);

    let targetElement = null;
    for (const el of elements) {
      const text = await el.innerText().catch(() => '');
      if (text.includes('Tải hóa đơn')) {
        const tagName = await el.evaluate(e => e.tagName);
        const className = await el.evaluate(e => e.className);
        const id = await el.evaluate(e => e.id);
        const isVisible = await el.isVisible();
        console.log(`Matching element: Tag=${tagName}, Class=${className}, Id=${id}, Visible=${isVisible}, Text="${text}"`);
        if (isVisible && !targetElement && tagName !== 'BODY' && tagName !== 'HTML') {
          targetElement = el;
        }
      }
    }

    if (targetElement) {
      console.log('Clicking target element "Tải hóa đơn"...');
      await targetElement.click();
      console.log('Clicked "Tải hóa đơn". Waiting 3 seconds...');
      await page.waitForTimeout(3000);

      // Capture screenshot after click
      await page.screenshot({ path: 'd:/Dashboard/server/downloads/misa_after_click.png' });
      console.log('After-click screenshot saved.');

      // Let's inspect what new elements appeared (like XML download options)
      const afterElements = await page.$$('div, span, a, button, li');
      for (const el of afterElements) {
        const text = await el.innerText().catch(() => '');
        if (text.includes('XML') || text.includes('Tải tệp XML') || text.includes('Tải XML')) {
          const tagName = await el.evaluate(e => e.tagName);
          const className = await el.evaluate(e => e.className);
          const isVisible = await el.isVisible();
          console.log(`New XML element: Tag=${tagName}, Class=${className}, Visible=${isVisible}, Text="${text}"`);
        }
      }
    } else {
      console.log('No visible element containing "Tải hóa đơn" found.');
    }

  } catch (error) {
    console.error('Error during MISA test:', error.message);
  } finally {
    await browser.close();
  }
}

testMisaInspect();
