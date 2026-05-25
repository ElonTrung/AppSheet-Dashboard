import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

/**
 * Đảm bảo thư mục tồn tại
 */
function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

/**
 * Giả lập trình duyệt để truy cập link tra cứu và tải file XML hóa đơn về máy
 * @param {object} invoice Nhiệm vụ hóa đơn cần tải { lookupUrl, lookupCode, provider, subject }
 * @returns {Promise<string|null>} Đường dẫn tới file XML đã tải về hoặc null nếu thất bại
 */
export async function downloadInvoiceXml(invoice) {
  const { lookupUrl, lookupCode, provider, sellerMst } = invoice;
  
  if (!lookupUrl) {
    console.error('Không có Link tra cứu, bỏ qua.');
    return null;
  }

  console.log(`\n[Playwright Bot] Đang xử lý tải hóa đơn [${provider}]...`);
  console.log(`  + Link: ${lookupUrl}`);
  console.log(`  + Mã: ${lookupCode}`);

  const browser = await chromium.launch({ 
    headless: true, // Chạy ẩn danh không hiển thị giao diện để tối ưu tài nguyên
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  
  const context = await browser.newContext({
    acceptDownloads: true, // Cho phép tải tệp xuống
    viewport: { width: 1280, height: 800 }
  });
  
  const page = await context.newPage();
  
  // Tạo thư mục tạm lưu trữ tệp hóa đơn tải về
  const tempDownloadDir = path.resolve('./server/downloads');
  if (!fs.existsSync(tempDownloadDir)) {
    fs.mkdirSync(tempDownloadDir, { recursive: true });
  }

  try {
    // 1. Điều hướng tới trang tra cứu
    await page.goto(lookupUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('  + Đã mở trang tra cứu thành công.');

    // 2. Tự động hóa dựa trên loại nhà cung cấp hóa đơn
    if (provider === 'MISA') {
      await handleMisaInvoice(page, lookupCode);
    } else if (provider === 'VNPT') {
      await handleVnptInvoice(page, lookupCode);
    } else if (provider === 'MINVOICE') {
      await handleMInvoice(page, lookupCode, sellerMst);
    } else {
      // CẢI TIẾN: Trước khi chạy cào chung, kiểm tra xem nút tải XML đã hiển thị sẵn chưa!
      // Nếu đã có sẵn nút tải XML, tức là link trực tiếp đã load xong hóa đơn, không cần điền input nữa!
      const quickSelectors = [
        'button:has-text("XML")', 
        'a:has-text("XML")', 
        '.btn-download-xml', 
        '#btnDownloadXml',
        'button:has-text("Tải tệp XML")'
      ];
      let alreadyVisible = false;
      for (const selector of quickSelectors) {
        const el = await page.$(selector);
        if (el && await el.isVisible()) {
          alreadyVisible = true;
          console.log(`  + Phát hiện hóa đơn đã tải sẵn (Nút tải visible: "${selector}"). Bỏ qua điền form.`);
          break;
        }
      }
      
      if (!alreadyVisible) {
        // Trường hợp nhà cung cấp chung/chưa xác định cụ thể
        await handleGenericInvoice(page, lookupCode);
      }
    }

    // 3. Tiến hành tìm kiếm nút tải xuống XML
    // Hầu hết các trang hóa đơn sau khi load xong sẽ có nút "Tải hóa đơn", "Tải XML" hoặc icon download
    console.log('  + Đang tìm kiếm nút tải tệp XML...');
    
    // Các selector phổ biến cho nút Tải XML của các bên phát hành hóa đơn
    const xmlButtonSelectors = [
      'button:has-text("XML")', 
      'a:has-text("XML")', 
      '.btn-download-xml', 
      '#btnDownloadXml', 
      'span:has-text("XML")',
      '[title*="XML"]',
      'button:has-text("Tải hóa đơn")',
      'a:has-text("Tải hóa đơn")',
      'button:has-text("Tải tệp")',
      'a:has-text("Tải tệp")'
    ];

    let downloadButton = null;
    
    if (provider === 'MISA') {
      console.log('  + Thực hiện mở menu tải hóa đơn MISA...');
      try {
        await page.waitForSelector('span.download-invoice', { timeout: 10000 });
        await page.click('span.download-invoice');
        console.log('  + Đã click span.download-invoice, đợi menu XML xuất hiện...');
        await page.waitForSelector('.dm-item.xml', { timeout: 5000 });
        downloadButton = await page.$('.dm-item.xml');
        if (downloadButton) {
          console.log('  + Tìm thấy nút tải XML của MISA.');
        }
      } catch (err) {
        console.log('  - Lỗi khi tìm menu tải MISA:', err.message);
      }
    }

    if (!downloadButton) {
      for (const selector of xmlButtonSelectors) {
        const element = await page.$(selector);
        if (element && await element.isVisible()) {
          downloadButton = element;
          console.log(`  + Tìm thấy nút tải bằng bộ lọc: "${selector}"`);
          break;
        }
      }
    }

    if (!downloadButton) {
      // Thử click vào nút "Tải xuống" chung trước, rồi mới hiện menu con chứa XML
      const generalDownloadSelectors = [
        'button:has-text("Tải xuống")',
        'a:has-text("Tải xuống")',
        'button:has-text("Tải tệp gốc")',
        'a:has-text("Tải tệp gốc")',
        '.btn-download',
        '#download',
        '[class*="download"]'
      ];
      
      for (const selector of generalDownloadSelectors) {
        const element = await page.$(selector);
        if (element && await element.isVisible()) {
          console.log(`  + Click nút tải chung: "${selector}"`);
          await element.click();
          await page.waitForTimeout(1500); // Đợi menu con hiển thị
          
          // Tìm lại nút tải XML
          const xmlSub = await page.$('button:has-text("XML"), a:has-text("XML"), li:has-text("XML"), span:has-text("XML")');
          if (xmlSub) {
            downloadButton = xmlSub;
            console.log('  + Tìm thấy nút tải XML trong menu con.');
            break;
          }
        }
      }
    }

    if (!downloadButton) {
      throw new Error('Không tìm thấy nút tải file XML hóa đơn trên giao diện.');
    }

    // 4. Thực hiện tải file và đợi hoàn tất
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }), // Chờ sự kiện tải xuống kích hoạt
      downloadButton.click() // Click nút tải XML
    ]);

    const filename = `${Date.now()}_${download.suggestedFilename()}`;
    let finalPath = path.join(tempDownloadDir, filename);
    
    await download.saveAs(finalPath);
    console.log(`  => Đã tải thành công và lưu trữ tại: ${finalPath}`);

    // Nếu tệp tải về là ZIP, tự động giải nén để lấy file XML bên trong
    if (finalPath.toLowerCase().endsWith('.zip')) {
      console.log('  + Phát hiện tệp tải về dạng ZIP. Tiến hành giải nén lấy XML...');
      const unzipDir = path.join(tempDownloadDir, `unzip_${Date.now()}`);
      if (!fs.existsSync(unzipDir)) {
        fs.mkdirSync(unzipDir, { recursive: true });
      }
      
      try {
        const { execSync } = await import('child_process');
        execSync(`powershell -Command "Expand-Archive -Force -Path '${finalPath}' -DestinationPath '${unzipDir}'"`, { stdio: 'ignore' });
        
        // Dò tìm file XML trong thư mục giải nén
        const files = fs.readdirSync(unzipDir);
        const xmlFile = files.find(f => f.toLowerCase().endsWith('.xml'));
        
        if (xmlFile) {
          const extractedXmlPath = path.join(unzipDir, xmlFile);
          const newXmlPath = finalPath.replace(/\.zip$/i, '.xml');
          
          fs.copyFileSync(extractedXmlPath, newXmlPath);
          console.log(`  => Giải nén thành công và trích xuất XML tại: ${newXmlPath}`);
          
          // Dọn dẹp file zip gốc và thư mục giải nén tạm
          try {
            fs.unlinkSync(finalPath);
            fs.rmSync(unzipDir, { recursive: true, force: true });
          } catch (e) {}
          
          finalPath = newXmlPath;
        } else {
          console.warn('  [-] Cảnh báo: Không tìm thấy file XML nào trong tệp ZIP.');
        }
      } catch (err) {
        console.error('  [-] Lỗi giải nén ZIP bằng PowerShell:', err.message);
      }
    }
    
    return finalPath;

  } catch (error) {
    console.error(`  => Lỗi tải hóa đơn [${provider}]:`, error.message);
    
    // Lưu ảnh screenshot khi bị lỗi để tiện debug kiểm tra
    try {
      const screenshotPath = path.join(tempDownloadDir, `error_${Date.now()}.png`);
      await page.screenshot({ path: screenshotPath });
      console.log(`  [Debug] Đã chụp ảnh màn hình lỗi tại: ${screenshotPath}`);
    } catch (e) {}

    return null;
  } finally {
    await browser.close();
  }
}

/**
 * Xử lý giao diện tra cứu của MISA MeInvoice
 */
async function handleMisaInvoice(page, lookupCode) {
  // Nếu link là trực tiếp (đã chứa token/TransactionID/sc xem hóa đơn), hoặc không có mã tra cứu thì xem trực tiếp
  if (page.url().includes('token=') || page.url().includes('TransactionID=') || page.url().includes('sc=') || !lookupCode || lookupCode === 'DIRECT_URL') {
    console.log('  + Phát hiện Link xem trực tiếp MISA. Đang đợi hóa đơn hiển thị...');
    await page.waitForTimeout(5000); // Chờ 5 giây để React App của MISA load xong hóa đơn
    return;
  }

  // Trường hợp cần điền mã tra cứu trên trang chủ MeInvoice
  console.log('  + Điền mã tra cứu trên cổng MISA...');
  const inputSelector = 'input[name="txtLookupCode"], input#txtLookupCode, input[placeholder*="mã tra cứu"]';
  await page.waitForSelector(inputSelector, { timeout: 5000 });
  await page.fill(inputSelector, lookupCode);
  
  // Nhấn nút Tìm kiếm/Tra cứu
  const searchBtnSelector = 'button#btnSearch, button:has-text("Tra cứu"), .btn-search';
  await page.click(searchBtnSelector);
  await page.waitForTimeout(3000);
}

/**
 * Xử lý giao diện tra cứu của VNPT
 */
async function handleVnptInvoice(page, lookupCode) {
  if (page.url().includes('key=') || page.url().includes('token=') || page.url().includes('EmailInvoiceView') || !lookupCode || lookupCode === 'DIRECT_URL') {
    console.log('  + Phát hiện Link xem trực tiếp VNPT. Đang đợi hiển thị...');
    await page.waitForTimeout(5000);
    return;
  }

  console.log('  + Điền mã tra cứu trên cổng VNPT...');
  const inputSelector = 'input#code, input[name*="code"], input[placeholder*="mã"]';
  await page.waitForSelector(inputSelector, { timeout: 5000 });
  await page.fill(inputSelector, lookupCode);
  
  // Click nút tra cứu
  await page.click('button:has-text("Tra cứu"), input[type="submit"]');
  await page.waitForTimeout(3000);
}

/**
 * Xử lý giao diện tra cứu Chung (Generic) cho các nhà cung cấp khác
 */
async function handleGenericInvoice(page, lookupCode) {
  if (!lookupCode || lookupCode === 'DIRECT_URL') {
    console.log('  + Phát hiện Link xem trực tiếp hoặc không có mã tra cứu. Đang đợi tải...');
    await page.waitForTimeout(5000);
    return;
  }

  // Thử dò tìm các ô input text hiển thị và hoạt động để điền mã tra cứu
  const inputs = await page.$$('input[type="text"], input[type="search"], input:not([type])');
  const visibleInputs = [];
  for (const input of inputs) {
    if (await input.isVisible() && await input.isEnabled()) {
      visibleInputs.push(input);
    }
  }

  if (visibleInputs.length > 0) {
    console.log(`  + Phát hiện ${visibleInputs.length} ô nhập liệu hiển thị. Tiến hành điền mã tra cứu vào ô đầu tiên...`);
    await visibleInputs[0].fill(lookupCode);
    
    // Dò tìm nút submit/search để click
    const submitBtn = await page.$([
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Tra cứu")',
      'a:has-text("Tra cứu")',
      'button:has-text("tra cứu")',
      'a:has-text("tra cứu")',
      'button:has-text("Tìm kiếm")',
      'a:has-text("Tìm kiếm")',
      'button:has-text("TRA CỨU HÓA ĐƠN")',
      'a:has-text("TRA CỨU HÓA ĐƠN")',
      '[id*="search"]',
      '[class*="search"]',
      '.btn-search',
      '#btnSearch'
    ].join(', '));
    if (submitBtn) {
      console.log('  + Đã tìm thấy nút Tra cứu/Tìm kiếm và tiến hành click.');
      await submitBtn.click();
      await page.waitForTimeout(3000);
    } else {
      console.log('  - Không tìm thấy nút Tra cứu/Tìm kiếm phù hợp.');
    }
  }
}

/**
 * Xử lý giao diện tra cứu của M-Invoice (Bình Minh)
 */
async function handleMInvoice(page, lookupCode, sellerMst) {
  if (page.url().includes('token=') || !lookupCode || lookupCode === 'DIRECT_URL') {
    console.log('  + Phát hiện Link xem trực tiếp M-Invoice. Đang đợi hiển thị...');
    await page.waitForTimeout(5000);
    return;
  }

  console.log('  + Điền thông tin tra cứu trên cổng M-Invoice...');
  
  // 1. Nhập Mã số thuế người bán
  const taxCodeSelector = 'input#taxCode, input[placeholder*="mã số thuế"], input[placeholder*="MST"]';
  await page.waitForSelector(taxCodeSelector, { timeout: 10000 });
  if (sellerMst) {
    await page.fill(taxCodeSelector, sellerMst);
    console.log(`  + Đã điền mã số thuế: ${sellerMst}`);
  } else {
    console.warn('  [!] Cảnh báo: Không tìm thấy sellerMst từ email.');
  }

  // 2. Nhập Mã bảo mật / mã tra cứu
  const checkCodeSelector = 'input#checkCode, input[placeholder*="mã tra cứu"], input[placeholder*="số bảo mật"]';
  await page.waitForSelector(checkCodeSelector, { timeout: 5000 });
  await page.fill(checkCodeSelector, lookupCode);
  console.log(`  + Đã điền mã tra cứu: ${lookupCode}`);

  // 3. Click nút Tra cứu
  const submitBtnSelector = 'button[type="submit"], button:has-text("Tra cứu")';
  await page.click(submitBtnSelector);
  console.log('  + Đã click nút Tra cứu. Đang đợi tải hóa đơn...');
  await page.waitForTimeout(5000);
}
