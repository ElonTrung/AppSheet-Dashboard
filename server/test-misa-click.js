import { chromium } from 'playwright';

async function testMisaClick() {
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

    // Option 1: Try hovering first
    console.log('Hovering on .res-btn.download...');
    await page.hover('.res-btn.download').catch(err => console.log('Hover error:', err.message));
    await page.waitForTimeout(1000);
    
    // Check if dropdown is visible
    let isMenuVisible = await page.isVisible('.download-menu');
    console.log('Menu visible after hover:', isMenuVisible);
    if (isMenuVisible) {
      await page.screenshot({ path: 'd:/Dashboard/server/downloads/misa_after_hover.png' });
    }

    // Option 2: Try clicking .download-invoice span
    console.log('Clicking span.download-invoice...');
    await page.click('span.download-invoice').catch(err => console.log('Click span error:', err.message));
    await page.waitForTimeout(2000);

    isMenuVisible = await page.isVisible('.download-menu');
    console.log('Menu visible after clicking span.download-invoice:', isMenuVisible);
    await page.screenshot({ path: 'd:/Dashboard/server/downloads/misa_after_click_span.png' });

    // Option 3: Try clicking .res-btn.download div
    if (!isMenuVisible) {
      console.log('Clicking div.res-btn.download...');
      await page.click('.res-btn.download').catch(err => console.log('Click div error:', err.message));
      await page.waitForTimeout(2000);
      isMenuVisible = await page.isVisible('.download-menu');
      console.log('Menu visible after clicking div.res-btn.download:', isMenuVisible);
      await page.screenshot({ path: 'd:/Dashboard/server/downloads/misa_after_click_div.png' });
    }

    // Option 4: Try directly clicking the XML link even if not visible by using page.evaluate or force click
    if (isMenuVisible) {
      console.log('Clicking visible XML menu item...');
      const downloadPromise = page.waitForEvent('download', { timeout: 5000 });
      await page.click('.dm-item.xml');
      const download = await downloadPromise;
      console.log('Downloaded file:', download.suggestedFilename());
    } else {
      console.log('Menu still not visible. Trying force click on .dm-item.xml...');
      const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(e => console.log('Download timeout:', e.message));
      await page.click('.dm-item.xml', { force: true }).catch(err => console.log('Force click error:', err.message));
      if (downloadPromise) {
        const download = await downloadPromise;
        if (download) {
          console.log('Downloaded file via force click:', download.suggestedFilename());
        }
      }
    }

  } catch (error) {
    console.error('Error during MISA test:', error.message);
  } finally {
    await browser.close();
  }
}

testMisaClick();
