const MISA_APP_ID = "63728f80-e51d-44cb-842b-717c4f3b2daf";
const MISA_APP_SECRET = "4RMY38Zw4H6pm3IMpDQq4uHAcYj6RlRjd1QbxpQSnT39lA2lSFXd7g2J3yXk1ix89CDKXmbxzacBYL+WJBPrI0cZ/E+4g0DwxvuEykzJyAKb6ZXa6MpJyzh4hYd0F4V2FLZ0SkIlhnx8PPznjR0y6y9Ml+muWfcmS1zfuwEScTG3/oDaXCaKO42ZFsih7T091XRh/OIV/vkL9HZWi7EB6w8uPli3GecJ6e8WfMzp4tVFmcOBeNVSfj9uNBpMU39l4ssL/B41smB3krhStIExGg==";

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
                access_code: MISA_APP_SECRET, // Chuỗi siêu dài này thực chất là access_code của MISA
                company_code: "KETOAN_2025",
                org_company_code: "KETOAN_2025"
            })
        });

        const data = await response.json();
        if (data && data.Success && data.Data) {
            // API MISA trả về Data dưới dạng chuỗi JSON, cần parse ra
            let tokenData = data.Data;
            try {
                if (typeof data.Data === 'string') {
                    tokenData = JSON.parse(data.Data);
                }
            } catch (e) {
                console.error("Lỗi parse JSON từ MISA Data", e);
            }
            
            if (tokenData && tokenData.access_token) {
                return tokenData.access_token;
            }
        }
        
        console.warn("Không lấy được MISA token. Server trả về:", data);
        return null;
    } catch (err) {
        console.warn("MISA Auth Error:", err);
        return null;
    }
};

/**
 * Lấy dữ liệu Danh mục Sản phẩm (Vật tư hàng hóa) từ MISA
 */
export const fetchMisaInventoryItems = async (token) => {
    if (!token) return [];
    try {
        let allItems = [];
        let skip = 0;
        const take = 1000; // API MISA giới hạn tối đa 1000/lần
        let hasMore = true;

        while (hasMore) {
            const response = await fetch('/misa-auth/apir/sync/actopen/get_dictionary', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-MISA-AccessToken': token
                },
                body: JSON.stringify({
                    app_id: MISA_APP_ID,
                    org_company_code: "KETOAN_2025",
                    data_type: 2, // 2 = Danh mục Vật tư hàng hóa
                    skip: skip,
                    take: take 
                })
            });

            const data = await response.json();
            if (data && data.Success && data.Data) {
                let parsedData = typeof data.Data === 'string' ? JSON.parse(data.Data) : data.Data;
                if (parsedData && parsedData.length > 0) {
                    allItems = allItems.concat(parsedData);
                    skip += take;
                    if (parsedData.length < take) {
                        hasMore = false; // Đã hết dữ liệu
                    }
                } else {
                    hasMore = false;
                }
            } else {
                hasMore = false;
            }
        }
        return allItems;
    } catch (err) {
        console.error("MISA Inventory Fetch Error:", err);
        return [];
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
        const response = await fetch('/misa-auth/amis-accounting/api/v1/purchase-vouchers', {
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
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    return [
        {
            RefNo: "MH-TODAY-01", // Số đơn/mã phiếu
            RefDate: todayStr,
            VendorName: "Công ty Cổ phần Thương mại Dịch vụ A", // Tên NCC
            TotalAmount: 15200000, // Tổng giá trị đơn hàng
            InvNo: "0000123" // Số hóa đơn
        },
        {
            RefNo: "MH-TODAY-02",
            RefDate: todayStr,
            VendorName: "Công ty TNHH Sản xuất B",
            TotalAmount: 24500000,
            InvNo: "0000124"
        },
        {
            RefNo: "MH-YEST-01",
            RefDate: yesterdayStr,
            VendorName: "Hộ kinh doanh Nguyễn Văn C",
            TotalAmount: 5600000,
            InvNo: "0000125"
        },
        {
            RefNo: "MH-YEST-02",
            RefDate: yesterdayStr,
            VendorName: "Công ty TNHH Vật liệu D",
            TotalAmount: 110000000,
            InvNo: "0000126"
        }
    ];
};

/**
 * Lấy dữ liệu Hóa Đơn Bán Hàng
 */
export const fetchMisaSalesData = async (token) => {
    if (!token) {
        console.warn("Bỏ qua gọi API thực vì không có Token. Sử dụng dữ liệu mẫu (Mock Data) Bán Hàng.");
        return getMockSalesData();
    }

    try {
        const response = await fetch('/misa-auth/amis-accounting/api/v1/sales-invoices', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-MISA-AccessToken': token,
                'Authorization': `Bearer ${token}` 
            }
        });

        const result = await response.json();
        
        if (!response.ok || !result.Success) {
            console.warn("MISA API returned error for Sales Data, using fallback Mock Data", result);
            return getMockSalesData();
        }

        return result.Data || [];
    } catch (err) {
        console.warn("MISA Sales Data Fetch Error:", err);
        return getMockSalesData();
    }
};

// Dữ liệu mẫu Bán Hàng
const getMockSalesData = () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    return [
        {
            RefNo: "BH-TODAY-01",
            RefDate: todayStr,
            CustomerName: "Công ty TNHH An Phát",
            TotalAmount: 35000000,
            InvNo: "HD00100"
        },
        {
            RefNo: "BH-TODAY-02",
            RefDate: todayStr,
            CustomerName: "Doanh nghiệp Tư nhân Bích Thủy",
            TotalAmount: 12500000,
            InvNo: "HD00101"
        },
        {
            RefNo: "BH-YEST-01",
            RefDate: yesterdayStr,
            CustomerName: "Công ty Cổ phần Xây dựng Hòa Bình",
            TotalAmount: 89000000,
            InvNo: "HD00102"
        },
        {
            RefNo: "BH-YESTERDAY-02",
            RefDate: yesterdayStr,
            CustomerName: "Cửa hàng VLXD Ngọc Phát",
            TotalAmount: 4200000,
            InvNo: "HD00098"
        }
    ];
};

/**
 * Đồng bộ Đơn hàng (AppSheet) sang MISA (Chứng từ bán hàng)
 */
export const syncOrderToMisa = async (token, orderRow, orderDetails) => {
    if (!token) throw new Error("Chưa kết nối MISA");

    // Mapping dữ liệu cơ bản
    const refDate = orderRow.Ngay_ban_hang || orderRow.Date || orderRow.Ngay_tao || new Date().toISOString().split('T')[0];
    const customerCode = orderRow.Ma_khach_hang || "KH_UNKNOWN"; 
    const customerName = orderRow.Ten_khach_hang || "Khách hàng lẻ";

    // Chi tiết sản phẩm
    const detail = orderDetails.map(item => ({
        inventory_item_code: item.Ma_san_pham || item.Ma_SP || "SP_UNKNOWN",
        inventory_item_name: item.Ten_san_pham || item.Ten_SP || "",
        quantity: Number(item.So_luong || item.Quantity || 1),
        unit_price: Number(item.Don_gia || item.Price || 0),
        amount: Number(item.Thanh_tien || item.Amount || 0),
        tax_rate: 10 // Giả định VAT 10%
    }));

    const payload = {
        app_id: MISA_APP_ID,
        org_company_code: "KETOAN_2025",
        data_type: 22, // 22 = SAOrder (Đơn đặt hàng)
        data: [
            {
                ref_no: orderRow.Ma_don_hang || orderRow.Order_ID || `DH-${Date.now()}`,
                ref_date: refDate,
                posted_date: refDate,
                account_object_code: customerCode,
                account_object_name: customerName,
                total_amount: Number(orderRow.Tong_tien_da_co_VAT || orderRow.Total || 0),
                journal_memo: `Đồng bộ đơn hàng ${orderRow.Ma_don_hang} từ AppSheet`,
                detail: detail
            }
        ]
    };

    try {
        const response = await fetch('/misa-auth/apir/sync/actopen/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-MISA-AccessToken': token
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (data && data.Success) {
            return { success: true, message: "Đồng bộ MISA thành công!" };
        } else {
            console.error("MISA Sync Error:", data);
            throw new Error(data.ErrorMessage || "Lỗi từ máy chủ MISA");
        }
    } catch (err) {
        console.error("MISA Sync Fetch Error:", err);
        throw err;
    }
};
