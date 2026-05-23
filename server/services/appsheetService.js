import axios from 'axios';

/**
 * Đồng bộ hóa dữ liệu hóa đơn đã bóc tách lên cơ sở dữ liệu AppSheet
 * @param {object} config Cấu hình chứa API Key và App ID
 * @param {object} invoiceData Dữ liệu hóa đơn đã bóc tách từ XML
 * @returns {Promise<object>} Kết quả đồng bộ { success: true/false, data/error }
 */
export async function syncInvoiceToAppSheet(config, invoiceData) {
  const appId = config.APPSHEET_APP_ID || 'e488fb86-d7f7-4dd2-970d-8246e1a05eee';
  const accessKey = config.APPSHEET_ACCESS_KEY || 'V2-WQdVR-MbOzC-ROAZT-aYCDs-NjjEo-nEp0D-VuZ4U-nVdeQ';
  const tableName = 'muahang';

  const url = `https://api.appsheet.com/api/v2/apps/${appId}/tables/${tableName}/Action`;

  // Tạo khóa chính unique kết hợp mã số thuế và số hóa đơn để tránh trùng lặp bản ghi
  const uniqueId = `MH-${invoiceData.soHoaDon}-${invoiceData.mstNCC}`;

  // Chuẩn bị dòng dữ liệu để ghi vào bảng muahang theo đúng các cột của user
  const rowData = {
    // Khóa chính
    "id": uniqueId,
    
    // Tên NCC
    "Ten_NCC": invoiceData.tenNCC,
    "supplier": invoiceData.tenNCC, // Fallback tên cột tiếng Anh
    
    // Tổng số tiền
    "Tong_tien_mua_hang_co_VAT": Number(invoiceData.tongTienCoVAT),
    "total": Number(invoiceData.tongTienCoVAT), // Fallback tiếng Anh
    
    // Số hóa đơn
    "So_hd": invoiceData.soHoaDon,
    "InvNo": invoiceData.soHoaDon,
    
    // Số tiền hóa đơn
    "So_tien_hoa_don": Number(invoiceData.tongTienCoVAT),

    // Ngày mua hàng / Ngày lập hóa đơn
    "Ngay_mua_hang": invoiceData.ngayHoaDon,
    "date": invoiceData.ngayHoaDon, // Fallback tiếng Anh
    "Date": invoiceData.ngayHoaDon,
    
    // Trạng thái hóa đơn tự động
    "status": "Đã quét XML",
    "Status": "Đã quét XML",
    
    // Các thông tin bổ trợ cực kỳ hữu ích cho kế toán đối soát
    "Ma_so_thue_NCC": invoiceData.mstNCC,
    "Ky_hieu_hd": invoiceData.kyHieu,
    "Tien_truoc_thue": Number(invoiceData.tongTienTruocThue),
    "Tien_thue": Number(invoiceData.tienThue)
  };

  const payload = {
    "Action": "Add",
    "Properties": {
      "Locale": "vi-VN",
      "Timezone": "Asia/Ho_Chi_Minh"
    },
    "Rows": [rowData]
  };

  try {
    console.log(`[AppSheet API] Đang gửi yêu cầu thêm hóa đơn ${invoiceData.soHoaDon} của NCC [${invoiceData.tenNCC}]...`);
    
    const response = await axios.post(url, payload, {
      headers: {
        'ApplicationAccessKey': accessKey,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 200) {
      console.log(`  => Đồng bộ AppSheet THÀNH CÔNG cho hóa đơn: ${invoiceData.soHoaDon}`);
      return { success: true, data: response.data };
    } else {
      throw new Error(`Mã phản hồi từ AppSheet API: ${response.status}`);
    }
  } catch (error) {
    const errorMsg = error.response && error.response.data 
      ? JSON.stringify(error.response.data) 
      : error.message;
    console.error(`  => Đồng bộ AppSheet THẤT BẠI:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Chuyển đổi tên công ty sang dạng chuẩn không dấu, chữ thường và lược bỏ các từ mô tả doanh nghiệp
 * để phục vụ việc so khớp chính xác hơn.
 * @param {string} name Tên công ty gốc
 * @returns {string} Tên công ty đã được chuẩn hóa rút gọn
 */
export function normalizeCompanyName(name) {
  if (!name) return '';
  
  // 1. Chuyển sang chữ thường và xóa khoảng trắng thừa
  let normalized = name.toLowerCase().trim();
  
  // 2. Loại bỏ dấu tiếng Việt
  normalized = normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  normalized = normalized.replace(/đ/g, "d");

  // 3. Loại bỏ các cụm từ doanh nghiệp, viết tắt phổ biến
  const keywordsToRemove = [
    /\bcong ty\b/g,
    /\bcty\b/g,
    /\btnhh\b/g,
    /\bco phan\b/g,
    /\bcp\b/g,
    /\bsan xuat\b/g,
    /\bsx\b/g,
    /\bthuong mai\b/g,
    /\btm\b/g,
    /\bdich vu\b/g,
    /\bdv\b/g,
    /\bxay dung\b/g,
    /\bxd\b/g,
    /\bco\b/g,
    /\bltd\b/g,
    /\bmember\b/g,
    /\bmtv\b/g,
    /\b1tv\b/g,
    /\bmot thanh vien\b/g,
    /\bdoanh nghiep\b/g,
    /\bdntn\b/g,
    /\btu nhan\b/g,
    /\bgroup\b/g,
    /\btap doan\b/g
  ];

  for (const kw of keywordsToRemove) {
    normalized = normalized.replace(kw, '');
  }

  // 4. Loại bỏ mọi ký tự đặc biệt và khoảng trắng, chỉ giữ lại chữ cái và số
  normalized = normalized.replace(/[^a-z0-9]/g, '');

  return normalized;
}

/**
 * Kiểm tra xem tên hai công ty có trùng khớp hay không dựa trên thuật toán chuẩn hóa
 * @param {string} name1 
 * @param {string} name2 
 * @returns {boolean} True nếu khớp, False nếu không
 */
export function isCompanyMatched(name1, name2) {
  const norm1 = normalizeCompanyName(name1);
  const norm2 = normalizeCompanyName(name2);
  
  if (!norm1 || !norm2) return false;
  
  // Khớp tuyệt đối phần lõi
  if (norm1 === norm2) return true;
  
  // Khớp bán phần nếu độ dài chuỗi lõi đủ lớn (tránh khớp nhầm các chuỗi quá ngắn)
  if (norm1.length >= 6 && norm2.length >= 6) {
    if (norm1.includes(norm2) || norm2.includes(norm1)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Chuẩn hóa số hóa đơn để so khớp chính xác (loại bỏ khoảng trắng, ký tự đặc biệt và các số 0 ở đầu)
 * Ví dụ: "00003727" -> "3727", "HD-0003727" -> "HD3727"
 * @param {string|number} invNo 
 * @returns {string} Số hóa đơn đã chuẩn hóa
 */
export function normalizeInvoiceNo(invNo) {
  if (!invNo) return '';
  const str = String(invNo).trim().toLowerCase();
  // Loại bỏ các chữ số 0 ở đầu tiên và các ký tự không phải chữ/số
  return str.replace(/^0+/, '').replace(/[^a-z0-9]/g, '');
}


/**
 * Lấy danh sách toàn bộ Đơn mua hàng từ bảng "muahang" của AppSheet
 * @param {object} config Cấu hình chứa API Key và App ID
 * @returns {Promise<Array>} Danh sách các dòng mua hàng
 */
export async function getAppSheetPurchaseOrders(config) {
  const appId = config.APPSHEET_APP_ID || 'e488fb86-d7f7-4dd2-970d-8246e1a05eee';
  const accessKey = config.APPSHEET_ACCESS_KEY || 'V2-WQdVR-MbOzC-ROAZT-aYCDs-NjjEo-nEp0D-VuZ4U-nVdeQ';
  const tableName = 'muahang';

  const url = `https://api.appsheet.com/api/v2/apps/${appId}/tables/${tableName}/Action`;

  const payload = {
    "Action": "Find",
    "Properties": {
      "Locale": "vi-VN",
      "Timezone": "Asia/Ho_Chi_Minh"
    },
    "Rows": []
  };

  try {
    console.log('[AppSheet API] Đang tải danh sách đơn mua hàng từ bảng "muahang"...');
    const response = await axios.post(url, payload, {
      headers: {
        'ApplicationAccessKey': accessKey,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 200 && Array.isArray(response.data)) {
      console.log(`  => Tải thành công ${response.data.length} dòng dữ liệu.`);
      return response.data;
    } else {
      throw new Error(`Định dạng phản hồi không hợp lệ hoặc mã lỗi: ${response.status}`);
    }
  } catch (error) {
    const errorMsg = error.response && error.response.data 
      ? JSON.stringify(error.response.data) 
      : error.message;
    console.error(`  => Lỗi tải danh sách đơn mua hàng từ AppSheet:`, errorMsg);
    return [];
  }
}

/**
 * Cập nhật Số hóa đơn và Số tiền hóa đơn cho một hoặc nhiều Đơn mua hàng trong AppSheet
 * @param {object} config Cấu hình chứa API Key và App ID
 * @param {string|Array} purchaseOrderKeys Khóa chính hoặc danh sách khóa chính của dòng mua hàng (cột So_mua_hang)
 * @param {object} invoiceData Thông tin hóa đơn bóc tách được (soHoaDon, tongTienCoVAT)
 * @returns {Promise<object>} Kết quả cập nhật { success: true/false, data/error }
 */
export async function updateInvoiceToAppSheet(config, purchaseOrderKeys, invoiceData, correctVendorName = null) {
  const appId = config.APPSHEET_APP_ID || 'e488fb86-d7f7-4dd2-970d-8246e1a05eee';
  const accessKey = config.APPSHEET_ACCESS_KEY || 'V2-WQdVR-MbOzC-ROAZT-aYCDs-NjjEo-nEp0D-VuZ4U-nVdeQ';
  const tableName = 'muahang';

  const url = `https://api.appsheet.com/api/v2/apps/${appId}/tables/${tableName}/Action`;

  const keys = Array.isArray(purchaseOrderKeys) ? purchaseOrderKeys : [purchaseOrderKeys];
  const rowsToUpdate = keys.map(key => {
    const row = {
      "So_mua_hang": key, // Khóa chính
      "So_hd": invoiceData.soHoaDon, // Điền số hóa đơn
      "So_tien_hoa_don": Number(invoiceData.tongTienCoVAT) // Điền số tiền có VAT trong hóa đơn
    };
    if (correctVendorName) {
      row["Ten_NCC"] = correctVendorName;
    }
    return row;
  });

  const payload = {
    "Action": "Edit",
    "Properties": {
      "Locale": "vi-VN",
      "Timezone": "Asia/Ho_Chi_Minh"
    },
    "Rows": rowsToUpdate
  };

  try {
    const keysStr = keys.join(', ');
    console.log(`[AppSheet API] Đang cập nhật hóa đơn số ${invoiceData.soHoaDon} vào các đơn mua hàng [${keysStr}]...`);
    const response = await axios.post(url, payload, {
      headers: {
        'ApplicationAccessKey': accessKey,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 200) {
      console.log(`  => Cập nhật AppSheet THÀNH CÔNG cho đơn mua hàng: [${keysStr}]`);
      return { success: true, data: response.data };
    } else {
      throw new Error(`Mã phản hồi từ AppSheet API khi Edit: ${response.status}`);
    }
  } catch (error) {
    const errorMsg = error.response && error.response.data 
      ? JSON.stringify(error.response.data) 
      : error.message;
    console.error(`  => Cập nhật AppSheet THẤT BẠI:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Chuyển đổi chuỗi ngày của AppSheet (ví dụ: dd/MM/yyyy hoặc MM/dd/yyyy) thành đối tượng Date của JS
 * @param {string} dateStr 
 * @returns {Date|null}
 */
export function parseAppSheetDate(dateStr) {
  if (!dateStr) return null;
  
  if (typeof dateStr === 'string') {
    dateStr = dateStr.trim();
    // Đôi khi có thể đi kèm giờ: "MM/dd/yyyy HH:mm:ss" -> Lấy phần date trước
    const datePart = dateStr.split(' ')[0];
    const parts = datePart.split('/');
    
    if (parts.length === 3) {
      const month = parseInt(parts[0], 10);
      const day = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      
      if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          return new Date(year, month - 1, day);
        }
      }
    }
  }
  
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Tìm kiếm tổ hợp từ 2 hoặc nhiều đơn mua hàng chưa khớp có tổng tiền bằng targetAmount
 * và khoảng cách ngày mua hàng lớn nhất giữa các đơn trong tổ hợp không quá 7 ngày.
 * @param {Array} vendorPOs Danh sách các đơn mua hàng chưa khớp của NCC
 * @param {number} targetAmount Số tiền hóa đơn mục tiêu
 * @returns {Array|null} Mảng các đơn mua hàng khớp tổ hợp hoặc null nếu không tìm thấy
 */
export function findMatchingCombination(vendorPOs, targetAmount, maxDiff = 1) {
  if (!Array.isArray(vendorPOs) || vendorPOs.length < 2) return null;

  // 1. Chuẩn bị dữ liệu và parse ngày/tiền
  const posWithMetadata = vendorPOs.map(po => {
    const date = parseAppSheetDate(po.Ngay_mua_hang);
    const amount = Number(po.Tong_tien_mua_hang_co_VAT || po.total || 0);
    return { po, date, amount };
  }).filter(item => item.date !== null && item.amount > 0);

  // 2. Sắp xếp theo ngày tăng dần
  posWithMetadata.sort((a, b) => a.date - b.date);

  const n = posWithMetadata.length;
  if (n < 2) return null;

  const MAX_GAP_MS = 7 * 24 * 60 * 60 * 1000; // 7 ngày tính bằng mili-giây
  let resultSubset = null;

  // Sử dụng thuật toán backtracking tìm kiếm tổ hợp phù hợp
  function backtrack(startIndex, currentSubset, currentSum, minDate, maxDate) {
    if (resultSubset) return; // Nếu đã tìm thấy một tổ hợp rồi thì dừng ngay

    // Kiểm tra xem tổ hợp hiện tại có từ 2 phần tử trở lên và tổng tiền khớp với hóa đơn hay không
    if (currentSubset.length >= 2 && Math.abs(currentSum - targetAmount) <= maxDiff) {
      resultSubset = [...currentSubset];
      return;
    }

    for (let i = startIndex; i < n; i++) {
      const item = posWithMetadata[i];

      // Tính toán min/max date mới khi đưa thêm phần tử i vào tổ hợp
      const newMinDate = minDate ? new Date(Math.min(minDate.getTime(), item.date.getTime())) : item.date;
      const newMaxDate = maxDate ? new Date(Math.max(maxDate.getTime(), item.date.getTime())) : item.date;

      // Kiểm tra ràng buộc lệch nhau không quá 7 ngày
      if (newMaxDate.getTime() - newMinDate.getTime() > MAX_GAP_MS) {
        continue;
      }

      currentSubset.push(item);
      backtrack(i + 1, currentSubset, currentSum + item.amount, newMinDate, newMaxDate);
      currentSubset.pop();
    }
  }

  backtrack(0, [], 0, null, null);

  if (resultSubset) {
    return resultSubset.map(item => item.po);
  }
  return null;
}

