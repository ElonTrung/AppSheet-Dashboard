import fs from 'fs';
import { XMLParser } from 'fast-xml-parser';

/**
 * Đọc file XML hóa đơn gốc và trích xuất các trường dữ liệu tiêu chuẩn theo Thông tư 78/2021/TT-BTC
 * @param {string} filePath Đường dẫn đến file XML đã tải về
 * @returns {object|null} Dữ liệu hóa đơn đã bóc tách hoặc null nếu lỗi
 */
export function parseInvoiceXml(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File không tồn tại: ${filePath}`);
    }

    const xmlData = fs.readFileSync(filePath, 'utf-8');
    
    // Cấu hình parser cho fast-xml-parser
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_"
    });
    
    const jsonObj = parser.parse(xmlData);

    // Xác định thẻ gốc của Hóa đơn (HDon hoặc Invoice)
    const hDDon = jsonObj.HDon || jsonObj.Invoice || (jsonObj.EInvoice ? jsonObj.EInvoice.HDon : null);
    
    if (!hDDon) {
      // Thử tìm kiếm sâu hơn nếu có thẻ bọc ngoài khác
      const keys = Object.keys(jsonObj);
      if (keys.length > 0 && jsonObj[keys[0]].HDon) {
        return parseXmlObject(jsonObj[keys[0]].HDon);
      }
      throw new Error('Định dạng XML không khớp với hóa đơn điện tử chuẩn (thiếu thẻ HDon).');
    }

    return parseXmlObject(hDDon);
  } catch (error) {
    console.error(`[XML Parser] Lỗi khi bóc tách file ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Hàm chuẩn hóa chuỗi và tránh lỗi khi gọi trim() trên các kiểu dữ liệu không phải chuỗi (số, undefined)
 */
function safeTrim(val) {
  if (val === undefined || val === null) return '';
  return String(val).trim();
}

/**
 * Hàm phân tích thực thể HDon đã tìm thấy trong file XML
 * @param {object} hDDon 
 * @returns {object}
 */
function parseXmlObject(hDDon) {
  // Lấy thẻ Dữ liệu hóa đơn (DLHDon)
  const DLHDon = hDDon.DLHDon || hDDon.DLHdon || hDDon;
  
  if (!DLHDon) {
    throw new Error('Thiếu phần Dữ liệu hóa đơn (DLHDon).');
  }

  // 1. Trích xuất thông tin chung (Số HĐ, Ngày lập, Ký hiệu...)
  const TTChung = DLHDon.TTChung || DLHDon.Ttchung || {};
  const shDon = TTChung.SHDon || TTChung.Shdon || '';
  const nLap = TTChung.NLap || TTChung.Nlap || '';
  const khDon = TTChung.KHHDon || TTChung.Khhdon || TTChung.KHDon || TTChung.Khdon || '';

  // 2. Trích xuất thông tin người bán (Nhà cung cấp)
  const NBan = (DLHDon.NDHDon || DLHDon.Ndhdon || DLHDon).NBan || (DLHDon.NDHDon || DLHDon.Ndhdon || DLHDon).Nban || {};
  const tenNCC = NBan.Ten || NBan.TenNBan || NBan.TenDonVi || '';
  const mstNCC = NBan.MST || NBan.Mst || '';
  const dchiNCC = NBan.DChi || NBan.Dchi || '';

  // 3. Trích xuất thông tin người mua (Công ty của user)
  const NMua = (DLHDon.NDHDon || DLHDon.Ndhdon || DLHDon).NMua || (DLHDon.NDHDon || DLHDon.Ndhdon || DLHDon).Nmua || {};
  const tenNMua = NMua.Ten || NMua.TenNMua || NMua.TenDonVi || '';
  const mstNMua = NMua.MST || NMua.Mst || '';

  // 4. Trích xuất thông tin thanh toán (Tiền trước thuế, Thuế suất, Tổng cộng có VAT)
  const NDHDon = DLHDon.NDHDon || DLHDon.Ndhdon || DLHDon;
  const TToan = DLHDon.TToan || DLHDon.Ttoan || NDHDon.TToan || NDHDon.Ttoan || {};
  
  // Tổng tiền trước thuế
  const tongTienTruocThue = Number(TToan.TgTCThue || TToan.Tgtcthue || TToan.TongTienChuaThue || 0);
  
  // Tiền thuế VAT
  const tienThue = Number(TToan.TgTThue || TToan.Tgtthue || TToan.TienThue || 0);

  // Tổng tiền thanh toán (đã có VAT)
  const tongTienCoVAT = Number(TToan.TgTTTBSo || TToan.Tgtttbso || TToan.TgTTTBH || TToan.Tgtttbh || TToan.TongTienThanhToan || 0);

  // 5. Trích xuất chi tiết danh sách mặt hàng
  const DSHHDVu = NDHDon.DSHHDVu || NDHDon.Dshhdvu || NDHDon.DSHHang || NDHDon.Dshhang || {};
  let items = [];
  const rawItems = DSHHDVu.HHDVu || DSHHDVu.Hhdvu || DSHHDVu.HChiTiet;
  if (rawItems) {
    const itemsList = Array.isArray(rawItems) ? rawItems : [rawItems];
    items = itemsList.map(item => ({
      ten: item.TenHHDV || item.Ten || item.THHDVu || item.Thhdvu || '',
      donViTinh: item.DVT || item.DVTinh || item.Dvtinh || '',
      soLuong: Number(item.SLuong || item.Soluong || 0),
      donGia: Number(item.DGia || item.Dongia || 0),
      thanhTien: Number(item.ThanhTien || item.ThTien || item.Thtien || 0),
      thueSuat: item.TSuat || item.Tsuat || '10%'
    }));
  }

  // Định dạng lại Ngày lập hóa đơn sang kiểu chuẩn yyyy-mm-dd để ghi vào database
  let formattedDate = nLap;
  if (nLap && typeof nLap === 'string') {
    // Nếu NLap dạng yyyy-mm-dd...
    if (nLap.includes('T')) {
      formattedDate = nLap.split('T')[0];
    } else if (nLap.includes('-') && nLap.length >= 10) {
      formattedDate = nLap.substring(0, 10);
    } else {
      // Nếu dạng dd/mm/yyyy
      const dateParts = nLap.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (dateParts) {
        formattedDate = `${dateParts[3]}-${dateParts[2]}-${dateParts[1]}`;
      }
    }
  }

  return {
    soHoaDon: String(shDon).padStart(8, '0'), // Số hóa đơn thường có 8 chữ số theo TT78 (ví dụ: 00003100)
    ngayHoaDon: formattedDate,
    kyHieu: khDon,
    
    // Người bán (Nhà cung cấp)
    tenNCC: safeTrim(tenNCC),
    mstNCC: safeTrim(mstNCC),
    diaChiNCC: safeTrim(dchiNCC),

    // Người mua
    tenNMua: safeTrim(tenNMua),
    mstNMua: safeTrim(mstNMua),

    // Giá trị
    tongTienTruocThue: tongTienTruocThue,
    tienThue: tienThue,
    tongTienCoVAT: tongTienCoVAT || (tongTienTruocThue + tienThue), // Hỗ trợ fallback cộng tiền

    // Danh sách mặt hàng chi tiết
    items: items
  };
}
