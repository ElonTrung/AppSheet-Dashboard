import { chromium } from 'playwright';

async function testMisa() {
  const url = 'https://api.meinvoice.vn/api/v3/WebHook/EmailTrackingHandler.ashx?TransactionID=25F8F3E18WK3&Email=vlxdtinthinh@gmail.com';
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
    const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('Response Status:', response ? response.status() : 'No response');
    console.log('Final URL after redirects:', page.url());

    // Wait extra time for SPA to render
    console.log('Waiting 10 seconds for page to render...');
    await page.waitForTimeout(10000);

    const content = await page.content();
    console.log('HTML Length:', content.length);
    console.log('HTML Snippet (First 1000 chars):', content.substring(0, 1000));

    // Capture screenshot
    const screenshotPath = 'd:/Dashboard/server/downloads/test_misa_result.png';
    await page.screenshot({ path: screenshotPath });
    console.log('Screenshot saved to:', screenshotPath);
  } catch (error) {
    console.error('Error during MISA test:', error.message);
  } finally {
    await browser.close();
  }
}

testMisa();
