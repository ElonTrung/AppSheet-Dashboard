const MISA_APP_ID = "63728f80-e51d-44cb-842b-717c4f3b2daf";
const MISA_APP_SECRET = "68/cINnxbH6rIQWW0GNRMnoeSMSqwU7p0J7nQCNNFH+BEhNXumX83scLVUCCS7xaJoM3oQHxsiS60MO24xpqoZaUVA9LwWyTDUbMxRYMpu0IDKJAe2x2prGhOBZkkJ+ho7ugq8sw9ykyap5Vkst8vqOzL/8z7o8iFZCl4VMmG3/I7O4LawV8o9iID8B5VHIzghzgO2fbXpytcJLUlQG2Kk0Ioi/xVqfUUa+zUEvV+JmWmE2wUh4VANC5JaLFCNrCdRKfPxLNH227zQrDzh6SOw==";

/**
 * Lấy Access Token từ server MISA
 * (Sử dụng Proxy /misa-auth để tránh CORS)
 */
export const getMisaAccessToken = async () => {
    try {
        const response = await fetch('/misa-auth/api/oauth/actopen/connect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                app_id: MISA_APP_ID,
                app_secret: MISA_APP_SECRET,
                company_code: "4001106158",
                org_company_code: "4001106158"
            })
        });

        const data = await response.json();
        if (data && data.access_token) {
            return data.access_token;
        } else {
            console.warn("Không lấy được MISA token. Server trả về:", data);
            return null;
        }
    } catch (err) {
        console.warn("MISA Auth Error:", err);
        return null;
    }
};

/**
 * Lấy dữ liệu danh sách chứng từ/đơn mua hàng
 * (Sử dụng Proxy /misa-api để tránh CORS)
 */
export const fetchMisaPurchaseData = async (token) => {
    if (!token) {
        console.warn("Bỏ qua gọi API thực vì không có Token. Sử dụng dữ liệu mẫu (Mock Data).");
        return getMockPurchaseData();
    }

    try {
        // MISA AMIS có Endpoint khác nhau tuỳ vào nghiệp vụ, giả sử dùng endpoint chuẩn cho Chứng Từ Mua Hàng:
        // Lưu ý: Endpoint chính xác cần xem tài liệu MISA cụ thể cho bản doanh nghiệp đang dùng.
        const response = await fetch('/misa-api/amis-accounting/api/v1/purchase-vouchers', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-MISA-AccessToken': token,
                'Authorization': `Bearer ${token}` 
            }
        });

        const result = await response.json();
        
        // Trả về mock data nếu API báo lỗi (để bạn có thể xem UI mẫu khi chưa setup server token hoàn chỉnh)
        if (!response.ok || !result.Success) {
            console.warn("MISA API returned error, using fallback Mock Data cho mục đích Demo UI", result);
            return getMockPurchaseData();
        }

        return result.Data || [];
    } catch (err) {
        console.warn("MISA Data Fetch Error:", err);
        return getMockPurchaseData();
    }
};

// Dữ liệu mẫu (Mock data) hiển thị cấu trúc Tên NCC, Giá trị, Số hóa đơn
const getMockPurchaseData = () => {
    return [
        {
            RefNo: "MH00001", // Số đơn/mã phiếu
            RefDate: "2024-04-09",
            VendorName: "Công ty Cổ phần Thương mại Dịch vụ A", // Tên NCC
            TotalAmount: 15200000, // Tổng giá trị đơn hàng
            InvNo: "0000123" // Số hóa đơn
        },
        {
            RefNo: "MH00002",
            RefDate: "2024-04-08",
            VendorName: "Công ty TNHH Sản xuất B",
            TotalAmount: 24500000,
            InvNo: "0000124"
        },
        {
            RefNo: "MH00003",
            RefDate: "2024-04-07",
            VendorName: "Hộ kinh doanh Nguyễn Văn C",
            TotalAmount: 5600000,
            InvNo: "0000125"
        },
        {
            RefNo: "MH00004",
            RefDate: "2024-04-06",
            VendorName: "Công ty TNHH Vật liệu D",
            TotalAmount: 110000000,
            InvNo: "0000126"
        }
    ];
};
