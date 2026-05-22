import { downloadInvoiceXml } from './services/crawlerService.js';

async function runTest() {
  console.log('=== KIỂM THỬ MODULE TRÌNH DUYỆT PLAYWRIGHT ===\n');
  console.log('Bot sẽ thử chạy trình duyệt ngầm để kết nối và kiểm tra hạ tầng Playwright.');

  // Tạo cấu hình tra cứu MISA giả lập (sử dụng một URL tra cứu công cộng/mẫu nếu có)
  // Ở đây chúng ta test mở trang chủ MeInvoice tra cứu hoặc một link mẫu
  const sampleInvoice = {
    provider: 'MISA',
    lookupUrl: 'https://www.meinvoice.vn/tra-cuu/',
    lookupCode: 'MISA_TEST_CODE',
    subject: 'Thử nghiệm hệ thống tải hóa đơn tự động'
  };

  const sampleMinvoice = {
    provider: 'MINVOICE',
    lookupUrl: 'http://tracuuhoadon.minvoice.vn',
    lookupCode: '468E4C7F',
    sellerMst: '0104959383',
    subject: 'Thử nghiệm hóa đơn Bình Minh M-Invoice'
  };

  console.log('Khởi chạy Bot tải hóa đơn MISA (Giả lập)...');
  try {
    const resultPath = await downloadInvoiceXml(sampleInvoice);
    if (resultPath) {
      console.log(`\n[Thành công] Playwright đã hoạt động ổn định và lưu file tại: ${resultPath}`);
    } else {
      console.log('\n[Thông tin] Không tải được file XML do mã tra cứu giả lập không tồn tại (đây là kết quả mong đợi khi test với mã giả).');
    }
  } catch (error) {
    console.error('\n[Lỗi] Playwright gặp lỗi hệ thống khi test MISA:', error.message);
  }

  console.log('\n---------------------------------------------------------');
  console.log('Khởi chạy Bot tải hóa đơn Bình Minh M-Invoice (Thật)...');
  try {
    const resultPath = await downloadInvoiceXml(sampleMinvoice);
    if (resultPath) {
      console.log(`\n[Thành công] Đã tải được file XML hóa đơn Bình Minh và lưu tại: ${resultPath}`);
    } else {
      console.error('\n[Lỗi] Không tải được file XML hóa đơn Bình Minh.');
    }
  } catch (error) {
    console.error('\n[Lỗi] Playwright gặp lỗi hệ thống khi test M-Invoice:', error.message);
  }
}

runTest();
