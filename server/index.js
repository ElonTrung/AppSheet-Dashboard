import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import cron from 'node-cron';

// Khởi chạy load biến môi trường từ .env (hỗ trợ cả root và server làm Cwd)
const envPath = fs.existsSync('./server/.env') ? './server/.env' : './.env';
dotenv.config({ path: path.resolve(envPath) });

import { fetchInvoiceEmails } from './services/emailService.js';
import { downloadInvoiceXml } from './services/crawlerService.js';
import { parseInvoiceXml } from './services/xmlParser.js';
import { 
  getAppSheetPurchaseOrders, 
  updateInvoiceToAppSheet, 
  isCompanyMatched,
  findMatchingCombination,
  parseAppSheetDate
} from './services/appsheetService.js';

const config = process.env;

/**
 * Quy trình xử lý cốt lõi của Bot
 */
async function runBotWorkflow() {
  console.log(`\n======================================================`);
  console.log(`[BOT ACTIVE] Khởi động phiên quét hóa đơn tự động...`);
  console.log(`Thời gian chạy: ${new Date().toLocaleString('vi-VN')}`);
  console.log(`======================================================`);

  // 1. Quét email lấy thông tin tra cứu từ 50 email gần nhất
  const pendingInvoices = await fetchInvoiceEmails(config);

  if (pendingInvoices.length === 0) {
    console.log('[Bot Workflow] Không phát hiện hóa đơn nào trong 50 thư gần nhất.');
    console.log(`======================================================\n`);
    return;
  }

  // 2. Lấy toàn bộ đơn mua hàng hiện tại từ AppSheet để đối soát
  const purchaseOrders = await getAppSheetPurchaseOrders(config);
  console.log(`[Bot Workflow] Đang tải ${purchaseOrders.length} đơn mua hàng từ AppSheet để chuẩn bị đối soát.`);

  console.log(`[Bot Workflow] Bắt đầu tải và xử lý ${pendingInvoices.length} hóa đơn mới...`);
  
  let successCount = 0;
  let failCount = 0;

  for (const invoice of pendingInvoices) {
    try {
      console.log(`\n------------------------------------------------------`);
      console.log(`Đang xử lý thư: "${invoice.subject}"`);
      
      // 3. Chạy giả lập trình duyệt tải XML hóa đơn gốc về máy
      const xmlFilePath = await downloadInvoiceXml(invoice);
      
      if (!xmlFilePath) {
        console.error(`[-] Bỏ qua hóa đơn này vì tải file XML thất bại.`);
        failCount++;
        continue;
      }

      // 4. Đọc dữ liệu từ file XML
      const parsedData = parseInvoiceXml(xmlFilePath);
      
      if (!parsedData) {
        console.error(`[-] Bỏ qua hóa đơn vì parse nội dung XML thất bại.`);
        // Xóa file lỗi để dọn dẹp bộ nhớ tạm
        try { fs.unlinkSync(xmlFilePath); } catch (e) {}
        failCount++;
        continue;
      }

      // 5. Đối soát thông tin hóa đơn với danh sách Đơn mua hàng từ AppSheet
      console.log(`[Đối soát] Tiến hành tìm đơn mua hàng khớp cho hóa đơn số: ${parsedData.soHoaDon}`);
      console.log(`  + Nhà cung cấp (Hóa đơn): "${parsedData.tenNCC}"`);
      console.log(`  + Số tiền có VAT (Hóa đơn): ${parsedData.tongTienCoVAT.toLocaleString('vi-VN')} VND`);

      // Kiểm tra xem hóa đơn này đã được đồng bộ lên AppSheet trước đó chưa
      const isAlreadySynced = purchaseOrders.some(po => {
        const poName = po.Ten_NCC || po.supplier || '';
        const poInvNo = po.So_hd || po.InvNo || '';
        return isCompanyMatched(poName, parsedData.tenNCC) && poInvNo.trim() === parsedData.soHoaDon.trim();
      });

      if (isAlreadySynced) {
        console.log(`[Đối soát] Hóa đơn số ${parsedData.soHoaDon} của NCC [${parsedData.tenNCC}] đã được đồng bộ trước đó. Bỏ qua.`);
        // Lưu trữ/di chuyển file XML vào thư mục lưu trữ nếu chưa có
        try {
          const archiveDir = path.resolve('./server/archive');
          if (!fs.existsSync(archiveDir)) {
            fs.mkdirSync(archiveDir, { recursive: true });
          }
          const archivePath = path.join(archiveDir, path.basename(xmlFilePath));
          if (!fs.existsSync(archivePath)) {
            fs.renameSync(xmlFilePath, archivePath);
          } else {
            fs.unlinkSync(xmlFilePath);
          }
        } catch (e) {}
        successCount++;
        continue;
      }

      // Tìm đơn mua hàng khớp trong AppSheet
      let matchedPO = null;
      const MAX_PRICE_DIFF = Number(config.MAX_PRICE_DIFF || 10000);
      
      // Tìm tất cả các đơn mua hàng thỏa mãn điều kiện khớp tên NCC và số tiền (cho phép sai số lệch tối đa MAX_PRICE_DIFF)
      const matchingPOs = purchaseOrders.filter(po => {
        const poName = po.Ten_NCC || po.supplier || '';
        const poTotal = Number(po.Tong_tien_mua_hang_co_VAT || po.total || 0);
        return isCompanyMatched(poName, parsedData.tenNCC) && Math.abs(poTotal - parsedData.tongTienCoVAT) <= MAX_PRICE_DIFF;
      });

      // Lọc các đơn chưa được điền số hóa đơn
      const emptyMatchingPOs = matchingPOs.filter(po => !po.So_hd || po.So_hd.trim() === '');

      if (emptyMatchingPOs.length > 0) {
        // Sắp xếp các đơn chưa điền theo Ngày mua hàng tăng dần (cũ nhất xếp đầu)
        emptyMatchingPOs.sort((a, b) => {
          const dateA = parseAppSheetDate(a.Ngay_mua_hang || a.date || '') || new Date(0);
          const dateB = parseAppSheetDate(b.Ngay_mua_hang || b.date || '') || new Date(0);
          return dateA - dateB;
        });
        
        matchedPO = emptyMatchingPOs[0];
      }

      if (matchedPO) {
        const keyVal = matchedPO.So_mua_hang;
        console.log(`[+] Tìm thấy đơn mua hàng KHỚP ĐƠN LẺ: "${keyVal}" của NCC [${matchedPO.Ten_NCC}] (Ưu tiên đơn hàng cũ nhất)`);
        
        // 6. Cập nhật số hóa đơn và số tiền hóa đơn lên AppSheet
        const updateResult = await updateInvoiceToAppSheet(config, keyVal, parsedData);
        
        if (updateResult.success) {
          successCount++;
          
          // Cập nhật local cache
          matchedPO.So_hd = parsedData.soHoaDon;
          matchedPO.So_tien_hoa_don = Number(parsedData.tongTienCoVAT);

          // Lưu trữ file XML đã xử lý
          const archiveDir = path.resolve('./server/archive');
          if (!fs.existsSync(archiveDir)) {
            fs.mkdirSync(archiveDir, { recursive: true });
          }
          const archivePath = path.join(archiveDir, path.basename(xmlFilePath));
          fs.renameSync(xmlFilePath, archivePath);
          console.log(`[+] Đã lưu trữ file XML vào thư mục: ${archivePath}`);
        } else {
          console.error(`[-] Cập nhật lên AppSheet thất bại cho hóa đơn này.`);
          failCount++;
        }
      } else {
        // Thử đối soát tổ hợp (Hóa đơn gộp)
        console.log(`[Đối soát] Không tìm thấy đơn mua hàng đơn lẻ khớp chưa điền. Thử tìm tổ hợp gộp hóa đơn cho NCC [${parsedData.tenNCC}]...`);
        const unmatchedVendorPOs = purchaseOrders.filter(po => {
          const poName = po.Ten_NCC || po.supplier || '';
          const hasInvoice = po.So_hd && po.So_hd.trim() !== '';
          return !hasInvoice && isCompanyMatched(poName, parsedData.tenNCC);
        });

        const matchedCombo = findMatchingCombination(unmatchedVendorPOs, parsedData.tongTienCoVAT, MAX_PRICE_DIFF);

        if (matchedCombo) {
          const keys = matchedCombo.map(po => po.So_mua_hang);
          console.log(`[+] Tìm thấy TỔ HỢP đơn hàng khớp gộp: [${keys.join(', ')}]`);
          
          // Cập nhật số hóa đơn và số tiền hóa đơn lên AppSheet cho toàn bộ tổ hợp
          const updateResult = await updateInvoiceToAppSheet(config, keys, parsedData);
          
          if (updateResult.success) {
            successCount++;
            
            // Cập nhật local cache để tránh đối soát trùng
            for (const po of matchedCombo) {
              po.So_hd = parsedData.soHoaDon;
              po.So_tien_hoa_don = Number(parsedData.tongTienCoVAT);
            }

            // Lưu trữ file XML đã xử lý
            const archiveDir = path.resolve('./server/archive');
            if (!fs.existsSync(archiveDir)) {
              fs.mkdirSync(archiveDir, { recursive: true });
            }
            const archivePath = path.join(archiveDir, path.basename(xmlFilePath));
            fs.renameSync(xmlFilePath, archivePath);
            console.log(`[+] Đã lưu trữ file XML vào thư mục: ${archivePath}`);
          } else {
            console.error(`[-] Cập nhật lên AppSheet thất bại cho tổ hợp hóa đơn này.`);
            failCount++;
          }
        } else {
          console.warn(`[!] KHÔNG TÌM THẤY đơn mua hàng hay tổ hợp nào khớp trên AppSheet cho hóa đơn số: ${parsedData.soHoaDon}`);
          console.warn(`    - NCC: "${parsedData.tenNCC}"`);
          console.warn(`    - Số tiền: ${parsedData.tongTienCoVAT.toLocaleString('vi-VN')} VND`);
          
          // Xóa file XML tạm
          try { fs.unlinkSync(xmlFilePath); } catch (e) {}
          failCount++;
        }
      }
    } catch (err) {
      console.error(`[Error] Lỗi không mong muốn khi xử lý một hóa đơn:`, err.message);
      failCount++;
    }
  }

  console.log(`\n======================================================`);
  console.log(`[PHIÊN QUÉT HOÀN TẤT]`);
  console.log(`- Xử lý đối soát thành công: ${successCount} hóa đơn`);
  console.log(`- Không khớp hoặc thất bại: ${failCount} hóa đơn`);
  console.log(`======================================================\n`);
}

// Lấy tham số dòng lệnh (Command Line Arguments)
const args = process.argv.slice(2);
const runOnce = args.includes('--once');

if (runOnce) {
  // Chế độ chạy một lần duy nhất (phục vụ kiểm thử hoặc lập lịch thủ công bên ngoài)
  console.log('Chế độ chạy một lần duy nhất (--once) được kích hoạt.');
  runBotWorkflow();
} else {
  // Chế độ Mặc định: Chạy thử ngay lập tức khi bật lên, sau đó tự động thiết lập lịch chạy lặp lại định kỳ
  console.log('Chế độ chạy nền (Scheduler) được kích hoạt.');
  
  // Chạy ngay lần đầu tiên để người dùng kiểm tra kết quả ngay lập tức
  runBotWorkflow();

  // Thiết lập lịch chạy lặp lại định kỳ bằng Cron Job (Đọc từ .env hoặc fallback theo môi trường)
  const defaultCron = config.NODE_ENV === 'development' ? '*/30 * * * *' : '0 23 * * *';
  const selectedCron = config.CRON_SCHEDULE || defaultCron;

  console.log(`[Scheduler] Đã lên lịch quét tự động định kỳ theo cron: "${selectedCron}"`);
  console.log(config.CRON_SCHEDULE 
    ? `[Cấu hình] Sử dụng lịch cron tùy chỉnh từ .env: "${selectedCron}"`
    : (config.NODE_ENV === 'development'
      ? `[Môi trường: DEV] Bot tự động quét mỗi 30 phút.` 
      : `[Môi trường: PROD] Bot tự động quét vào lúc 23:00 hàng đêm.`
    )
  );

  cron.schedule(selectedCron, async () => {
    await runBotWorkflow();
  });
}
