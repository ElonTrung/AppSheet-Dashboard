const APP_ID = "e488fb86-d7f7-4dd2-970d-8246e1a05eee";
const ACCESS_KEY = "V2-WQdVR-MbOzC-ROAZT-aYCDs-NjjEo-nEp0D-VuZ4U-nVdeQ";

export const fetchAppSheetData = async (tableName) => {
  try {
    const url = `/appsheet-api/api/v2/apps/${APP_ID}/tables/${tableName}/Action`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'ApplicationAccessKey': ACCESS_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        Action: "Find",
        Properties: {
          Locale: "en-US",
          Timezone: "UTC"
        },
        Rows: []
      })
    });

    if (!response.ok) {
      console.warn(`Failed to fetch ${tableName}. Returning mock data.`);
      return getMockData(tableName);
    }

    const data = await response.json();
    if (!data || data.length === 0) {
        return getMockData(tableName);
    }
    return data;
  } catch (error) {
    console.error(`Error connecting to AppSheet for ${tableName}:`, error);
    return getMockData(tableName);
  }
};

const getMockData = (type) => {
  if (type === "baogia") {
    return [
      { id: "BG-01", khachhang: "Nam Hải JS", date: "2026-04-01", total: 15000000, status: "Sent" },
      { id: "BG-02", khachhang: "TechCorp Global", date: "2026-04-03", total: 22000000, status: "Approved" },
      { id: "BG-03", khachhang: "Anh Khoa", date: "2026-04-05", total: 8500000, status: "Pending" },
      { id: "BG-04", khachhang: "Phượng Cát", date: "2026-04-07", total: 47000000, status: "Sent" },
    ];
  } else if (type === "donhang") {
    return [
      { id: "DH-01", khachhang: "TechCorp Global", date: "2026-04-02", total: 22000000, status: "Completed" },
      { id: "DH-02", khachhang: "Hải Lộc", date: "2026-04-04", total: 5400000, status: "Processing" },
      { id: "DH-03", khachhang: "Thanh Yến", date: "2026-04-06", total: 11000000, status: "Completed" },
      { id: "DH-04", khachhang: "Ngọc Diệp", date: "2026-04-08", total: 15000000, status: "New" },
    ];
  } else if (type === "muahang") {
     return [
      { id: "MH-01", supplier: "NPP Tuấn Tú", date: "2026-04-02", total: 8000000, status: "Received" },
      { id: "MH-02", supplier: "Sỉ Lê Vũ", date: "2026-04-04", total: 14000000, status: "Pending" },
      { id: "MH-03", supplier: "NPP Tuấn Tú", date: "2026-04-05", total: 3500000, status: "Received" },
      { id: "MH-04", supplier: "Supply Chain VN", date: "2026-04-07", total: 9500000, status: "Pending" },
    ];
  } else if (type === "ncc") {
    return [
      { _RowNumber: 1, Ma_NCC: "NCC-01", Ten_NCC: "Công ty Vật Liệu Toàn Cầu", So_dien_thoai: "0901234567", Email: "contact@toancau.vn" },
      { _RowNumber: 2, Ma_NCC: "NCC-02", Ten_NCC: "Xưởng Sắt Thép Hưng Phát", So_dien_thoai: "0987654321", Email: "hungphat@gmail.com" },
      { _RowNumber: 3, Ma_NCC: "NCC-03", Ten_NCC: "Cơ Khí Trọng Tín", So_dien_thoai: "0912345678", Email: "sales@trongtin.com" }
    ];
  } else if (type === "denghichi") {
      return [
        { id: "DGC-01", so_don_hang: "DH-01", date: "2026-04-02", Tong_tien: 2000000, reason: "Bồi dưỡng bốc xếp" },
        { id: "DGC-02", so_don_hang: "DH-03", date: "2026-04-06", Tong_tien: 1500000, reason: "Phí phụ cấp" },
      ];
  } else if (type === "vanchuyen") {
      return [
        { id: "VC-01", so_don_hang: "DH-01", date: "2026-04-02", Tong_tien_truoc_VAT: 1000000, status: "Đã giao" },
        { id: "VC-02", so_don_hang: "DH-03", date: "2026-04-06", Tong_tien_truoc_VAT: 800000, status: "Đang giao" },
      ];
  }
  return [];
};
