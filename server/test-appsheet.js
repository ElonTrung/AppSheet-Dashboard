import dotenv from 'dotenv';
import path from 'path';
import { syncInvoiceToAppSheet } from './services/appsheetService.js';

dotenv.config({ path: path.resolve('./server/.env') });
const config = process.env;

async function runTest() {
  console.log('=== KIỂM THỬ MODULE ĐỒNG BỘ APPSHEET ===\n');

  // Kiểm tra cấu hình trong file .env
  if (!config.APPSHEET_APP_ID || config.APPSHEET_APP_ID === 'e488fb86-d7f7-4dd2-970d-8246e1a05eee' && !config.APPSHEET_ACCESS_KEY) {
    console.log('[!] Lưu ý: Bot đang sử dụng các mã App ID và Access Key mặc định lấy từ dự án Dashboard.');
  }

  // Dữ liệu hóa đơn mẫu giống hệt định dạng trả về sau khi parse XML
  const mockInvoiceData = {
    soHoaDon: '0009999', // Số hóa đơn thử nghiệm
    ngayHoaDon: new Date().toISOString().split('T')[0], // Ngày lập hôm nay
    kyHieu: '1C26TAA',
    tenNCC: 'CÔNG TY TNHH GIẢI PHÁP BOT TỰ ĐỘNG ANTIGRAVITY',
    mstNCC: '0102030405-999',
    diaChiNCC: 'Tòa nhà Landmark 81, TP. Hồ Chí Minh',
    tenNMua: 'CÔNG TY TRUNG TÍN',
    mstNMua: '0315789123',
    tongTienTruocThue: 10000000,
    tienThue: 1000000,
    tongTienCoVAT: 11000000 // 11,000,000 VND
  };

  console.log('Đang đồng bộ hóa đơn mẫu lên AppSheet...');
  
  const result = await syncInvoiceToAppSheet(config, mockInvoiceData);
  
  console.log('\n--- KẾT QUẢ ĐỒNG BỘ ---');
  if (result.success) {
    console.log('[Thành công] Hóa đơn mẫu đã được ghi thành công vào bảng "muahang" trong AppSheet!');
    console.log('Vui lòng mở ứng dụng AppSheet hoặc React Dashboard của bạn lên để kiểm tra xem dòng mới có xuất hiện không.');
    console.log('Khóa chính đã ghi (id):', `MH-${mockInvoiceData.soHoaDon}-${mockInvoiceData.mstNCC}`);
  } else {
    console.log('[Thất bại] Lỗi đồng bộ lên AppSheet:', result.error);
    console.log('Gợi ý:');
    console.log('1. Đảm bảo bảng "muahang" tồn tại trong AppSheet của bạn.');
    console.log('2. Đảm bảo cột khóa chính tên là "id" (hoặc điều chỉnh trong file server/services/appsheetService.js nếu cột khóa chính của bạn tên khác).');
    console.log('3. Kiểm tra xem quyền ghi API Key đã được bật trong AppSheet Editor chưa.');
  }
}

runTest();
