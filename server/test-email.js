import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { extractInvoiceDetails, fetchInvoiceEmails } from './services/emailService.js';

dotenv.config({ path: path.resolve(fs.existsSync('./server/.env') ? './server/.env' : './.env') });
const config = process.env;

async function runTest() {
  console.log('=== KIỂM THỬ MODULE TRÍCH XUẤT EMAIL ===\n');

  // PHẦN 1: Kiểm thử trích xuất bằng dữ liệu Mock HTML (Chạy ngoại tuyến)
  console.log('--- PHẦN 1: Kiểm thử trích xuất dữ liệu giả lập (Offline) ---');
  
  const mockEmailHtml = `
    <html>
      <body>
        <p>Kính gửi quý khách hàng, đơn hàng của quý khách đã được xuất hóa đơn.</p>
        <p>Quý khách vui lòng truy cập vào đường link sau để nhận hóa đơn điện tử:</p>
        <a href="https://www.meinvoice.vn/tra-cuu/detail?token=a1b2c3d4e5f6g7h8i9j0k">Xem hóa đơn MISA</a>
        <p>Hoặc truy cập trang meinvoice.vn và nhập thông tin:</p>
        <div><strong>Mã tra cứu:</strong> MISA12345678</div>
        <p>Trân trọng cảm ơn!</p>
      </body>
    </html>
  `;

  const extracted = extractInvoiceDetails(mockEmailHtml, '');
  console.log('Nội dung trích xuất giả lập:');
  console.log(JSON.stringify(extracted, null, 2));
  
  if (extracted.lookupUrl && extracted.lookupCode === 'DIRECT_URL') {
    console.log('=> Đạt yêu cầu: Trích xuất thành công Link MISA trực tiếp.');
  } else {
    console.log('=> Trích xuất giả lập chưa tối ưu.');
  }

  console.log('\n--- PHẦN 1.2: Kiểm thử trích xuất NCC Bình Minh (M-Invoice) ---');
  const mockBinhMinhHtml = `
    <html>
      <body>
        <p>Kính gửi: CÔNG TY TNHH XÂY DỰNG TÍN THỊNH</p>
        <p>Mã số thuế: 4001106158</p>
        <p>Vào ngày 21/05/2026, CÔNG TY TNHH MỘT THÀNH VIÊN THƯƠNG MẠI VÀ KỸ THUẬT BÌNH MINH đã xuất hóa đơn điện tử...</p>
        <ul>
          <li>Ký hiệu hóa đơn: 1C26TKT</li>
          <li>Số hóa đơn: 593</li>
          <li>Ngày lập: 21/05/2026</li>
          <li>Số bảo mật: 468E4C7F</li>
        </ul>
        <p>Hướng dẫn tra cứu:</p>
        <p>Bước 1: Đăng nhập vào website: http://tracuuhoadon.minvoice.vn</p>
        <p>Bước 2: Nhập mã số thuế của Đơn vị bán: 0104959383</p>
        <p>Bước 3: Nhập mã Số bảo mật (Mã tra cứu hóa đơn): 468E4C7F</p>
        <p>Bước 4: Click nút Tra cứu</p>
      </body>
    </html>
  `;
  const extBM = extractInvoiceDetails(mockBinhMinhHtml, '');
  console.log('Nội dung trích xuất Bình Minh:');
  console.log(JSON.stringify(extBM, null, 2));

  if (
    extBM.provider === 'MINVOICE' && 
    extBM.sellerMst === '0104959383' && 
    extBM.lookupCode === '468E4C7F' && 
    extBM.lookupUrl === 'http://tracuuhoadon.minvoice.vn'
  ) {
    console.log('=> ĐẠT YÊU CẦU: Trích xuất chính xác MST, Số bảo mật và Website của Bình Minh M-Invoice.');
  } else {
    console.error('=> THẤT BẠI: Trích xuất thông tin Bình Minh chưa chính xác.');
  }

  console.log('\n---------------------------------------------------------');

  // PHẦN 2: Kết nối IMAP thật nếu đã cấu hình thông tin đăng nhập trong file .env
  console.log('--- PHẦN 2: Kiểm thử kết nối hòm thư Gmail thật (Online) ---');
  if (!config.EMAIL_USER || config.EMAIL_USER === 'your_email@gmail.com' || config.EMAIL_PASS === 'xxxx_xxxx_xxxx_xxxx') {
    console.log('[!] Bỏ qua kiểm thử Online: Vui lòng cập nhật EMAIL_USER và EMAIL_PASS thật trong file server/.env trước.');
    return;
  }

  try {
    const list = await fetchInvoiceEmails(config);
    console.log(`\nKết quả quét trực tuyến: Tìm thấy ${list.length} email hóa đơn hợp lệ.`);
    console.log(JSON.stringify(list, null, 2));
  } catch (error) {
    console.error('Lỗi khi kiểm thử kết nối Gmail thật:', error.message);
  }
}

runTest();
