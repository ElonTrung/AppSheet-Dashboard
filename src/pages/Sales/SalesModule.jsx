import React, { useState } from 'react';
import { Plus, Edit2, Trash2, FileText, ShoppingCart, RefreshCw } from 'lucide-react';
import AppSheetForm from './AppSheetForm';
import { mutateAppSheetData } from '../../services/appsheet';
import { getMisaAccessToken, syncOrderToMisa } from '../../services/misa';

export default function SalesModule({ dataBG, dataDH, dataCTDH, onRefresh }) {
    const [activeTab, setActiveTab] = useState('quotes');
    const [formConfig, setFormConfig] = useState(null);
    const [syncingOrder, setSyncingOrder] = useState(null);

    const handleSyncMisa = async (item) => {
        try {
            const refId = item.Order_ID || item.Ma_don_hang || item.id;
            setSyncingOrder(refId);
            const token = await getMisaAccessToken();
            
            const details = dataCTDH ? dataCTDH.filter(d => (d.Order_ID === refId || d.Ma_don_hang === refId || d.donhang_id === refId || d.Ma_Bao_Gia === refId)) : [];
            
            if (details.length === 0) {
                alert("Đơn hàng này chưa có chi tiết sản phẩm. Vui lòng thêm sản phẩm trước khi đồng bộ MISA!");
                setSyncingOrder(null);
                return;
            }

            const result = await syncOrderToMisa(token, item, details);
            alert(result.message);
        } catch (error) {
            alert(`Đồng bộ thất bại:\n${error.message}`);
        } finally {
            setSyncingOrder(null);
        }
    };

    const handleAdd = () => {
        if (activeTab === 'quotes') {
            setFormConfig({
                tableName: 'baogia',
                action: 'Add',
                initialData: { id: `BG-NEW-${Math.floor(Math.random() * 1000)}`, date: new Date().toISOString().split('T')[0], status: 'Pending' },
                fields: [
                    { name: 'id', label: 'Số Báo Giá', required: true },
                    { name: 'khachhang', label: 'Khách Hàng', required: true },
                    { name: 'date', label: 'Ngày Báo Giá', type: 'date', required: true },
                    { name: 'total', label: 'Tổng Tiền', type: 'number', required: true },
                    { name: 'status', label: 'Trạng Thái', type: 'select', options: ['Pending', 'Sent', 'Approved'], required: true }
                ]
            });
        } else {
            setFormConfig({
                tableName: 'donhang',
                action: 'Add',
                initialData: { id: `DH-NEW-${Math.floor(Math.random() * 1000)}`, date: new Date().toISOString().split('T')[0], status: 'New' },
                fields: [
                    { name: 'id', label: 'Số Đơn Hàng', required: true },
                    { name: 'khachhang', label: 'Khách Hàng', required: true },
                    { name: 'date', label: 'Ngày Bán Hàng', type: 'date', required: true },
                    { name: 'total', label: 'Tổng Tiền', type: 'number', required: true },
                    { name: 'status', label: 'Trạng Thái', type: 'select', options: ['New', 'Processing', 'Completed'], required: true }
                ]
            });
        }
    };

    const handleEdit = (item) => {
        if (activeTab === 'quotes') {
            setFormConfig({
                tableName: 'baogia',
                action: 'Edit',
                initialData: item,
                fields: [
                    { name: 'id', label: 'Số Báo Giá', required: true },
                    { name: 'khachhang', label: 'Khách Hàng', required: true },
                    { name: 'date', label: 'Ngày Báo Giá', type: 'date', required: true },
                    { name: 'total', label: 'Tổng Tiền', type: 'number', required: true },
                    { name: 'status', label: 'Trạng Thái', type: 'select', options: ['Pending', 'Sent', 'Approved'], required: true }
                ]
            });
        } else {
            setFormConfig({
                tableName: 'donhang',
                action: 'Edit',
                initialData: item,
                fields: [
                    { name: 'id', label: 'Số Đơn Hàng', required: true },
                    { name: 'khachhang', label: 'Khách Hàng', required: true },
                    { name: 'date', label: 'Ngày Bán Hàng', type: 'date', required: true },
                    { name: 'total', label: 'Tổng Tiền', type: 'number', required: true },
                    { name: 'status', label: 'Trạng Thái', type: 'select', options: ['New', 'Processing', 'Completed'], required: true }
                ]
            });
        }
    };

    const handleDelete = async (item) => {
        if (window.confirm(`Bạn có chắc muốn xóa ${item.id || item.So_bao_gia || item.So_don_hang} khỏi AppSheet?`)) {
            const tableName = activeTab === 'quotes' ? 'baogia' : 'donhang';
            const res = await mutateAppSheetData(tableName, 'Delete', item);
            if (res.success) {
                alert("Xóa thành công!");
                onRefresh();
            } else {
                alert("Xóa thất bại (hoặc đây là dữ liệu Mock). " + (res.error || ''));
            }
        }
    };

    const getCustName = (row) => row.Ten_khach_hang || row.khachhang || row.Khachhang || row['Khách hàng'] || "Unknown";
    const getCode = (row) => row.So_bao_gia || row.So_don_hang || row.id || row.ID || "N/A";
    const getDateStr = (row) => row.Ngay_bao_gia || row.Ngay_ban_hang || row.date || row.Date || "N/A";
    const getVal = (row) => Number(row.Tong_tien_da_co_VAT || row['Tong_tien_da_ co_VAT'] || row.total || row.Total || 0);

    const dataSource = activeTab === 'quotes' ? dataBG : dataDH;

    const parseDateHelper = (dateStr) => {
        if (!dateStr) return new Date();
        let str = String(dateStr).split(' ')[0];
        if (str.includes('/')) {
            const parts = str.split('/');
            if (parts.length === 3) {
                let p1 = Number(parts[0]);
                let p2 = Number(parts[1]);
                let m = p1, d = p2;
                if (p1 > 12) { m = p2; d = p1; }
                return new Date(`${parts[2]}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}T00:00:00`);
            }
        }
        return new Date(str);
    };

    const processData = (sourceData) => {
        const sorted = [...sourceData].sort((a, b) => {
            const da = parseDateHelper(getDateStr(a)).getTime();
            const db = parseDateHelper(getDateStr(b)).getTime();
            return isNaN(db) || isNaN(da) ? 0 : db - da; 
        });
        
        const groups = {};
        const totalItems = sorted.length;

        sorted.forEach((item, idx) => {
            const d = parseDateHelper(getDateStr(item));
            let dKey = "Unknown Date";
            if (d && !isNaN(d.getTime())) {
                dKey = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
            }
            if (!groups[dKey]) {
                groups[dKey] = { date: dKey, totalVal: 0, items: [] };
            }
            groups[dKey].totalVal += getVal(item);
            groups[dKey].items.push({ ...item, _stt: totalItems - idx });
        });

        return Object.values(groups);
    };

    const groupedData = processData(dataSource);

    return (
        <div className="animated-view" style={{ padding: '24px 32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 600 }}>Quản Lý Bán Hàng</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Thêm, Sửa, Xóa tương trực tiếp với AppSheet Database</p>
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <button onClick={onRefresh} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'white', cursor: 'pointer' }}>
                        <RefreshCw size={18} /> Làm mới
                    </button>
                    <button onClick={handleAdd} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                        <Plus size={18} /> Thêm Mới
                    </button>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '24px', overflowX: 'auto', minHeight: '600px' }}>
                <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '16px', marginBottom: '16px' }}>
                     <button 
                         onClick={() => setActiveTab('quotes')} 
                         style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px', background: activeTab === 'quotes' ? 'rgba(59, 130, 246, 0.1)' : 'transparent', color: activeTab === 'quotes' ? '#3b82f6' : 'var(--text-secondary)', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                     >
                         <FileText size={18} /> Báo Giá
                     </button>
                     <button 
                         onClick={() => setActiveTab('orders')} 
                         style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px', background: activeTab === 'orders' ? 'rgba(16, 185, 129, 0.1)' : 'transparent', color: activeTab === 'orders' ? '#10b981' : 'var(--text-secondary)', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                     >
                         <ShoppingCart size={18} /> Đơn Hàng
                     </button>
                </div>

                <table className="data-table" style={{ width: '100%', borderSpacing: '0 8px', borderCollapse: 'separate' }}>
                    <thead>
                        <tr>
                            <th style={{ width: '140px' }}>Ngày</th>
                            <th>{activeTab === 'quotes' ? 'Số báo giá' : 'Số đơn hàng'}</th>
                            <th>Tên khách hàng</th>
                            <th>Dự án</th>
                            <th style={{ textAlign: 'right' }}>Tổng Tiền</th>
                            <th style={{ textAlign: 'center' }}>Trạng Thái</th>
                            <th style={{ textAlign: 'center', width: '90px' }}>Thao Tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {groupedData.length > 0 ? groupedData.map((group, gIdx) => (
                            <React.Fragment key={gIdx}>
                                <tr>
                                    <td colSpan={7} style={{ padding: '16px 0 4px 16px', fontWeight: 700, color: 'var(--accent-blue)', fontSize: '15px' }}>
                                        {group.date}
                                        <span style={{ float: 'right', marginRight: '20px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                            Tổng: <span style={{ color: 'var(--accent-green)' }}>{new Intl.NumberFormat('vi-VN').format(group.totalVal)} đ</span>
                                        </span>
                                    </td>
                                </tr>
                                {group.items.map((item, iIdx) => (
                                    <tr key={iIdx}>
                                        <td style={{ padding: '20px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500 }}>
                                            {group.date} - {item._stt}
                                        </td>
                                        <td style={{ padding: '20px', fontWeight: 600, color: 'var(--text-primary)' }}>{getCode(item)}</td>
                                        <td style={{ padding: '20px', color: 'var(--text-secondary)' }}>{getCustName(item)}</td>
                                        <td style={{ padding: '20px', color: 'var(--text-secondary)' }}>{item.Du_an || item.Ten_du_an || 'Siêu Thị Vật Tư'}</td>
                                        <td style={{ padding: '20px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(getVal(item))}
                                        </td>
                                        <td style={{ padding: '20px', textAlign: 'center' }}>
                                            <span className={`status-badge status-${String(item.status || item.Trang_thai || 'pending').toLowerCase()}`}>
                                                {item.status || item.Trang_thai || 'Pending'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '20px', textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                            {activeTab === 'orders' && (
                                                <button 
                                                    onClick={() => handleSyncMisa(item)} 
                                                    disabled={syncingOrder === (item.Order_ID || item.Ma_don_hang || item.id)}
                                                    style={{ background: 'rgba(16,185,129,0.1)', border: 'none', padding: '8px', borderRadius: '8px', color: '#10b981', cursor: syncingOrder === (item.Order_ID || item.Ma_don_hang || item.id) ? 'wait' : 'pointer', transition: 'all 0.2s' }} 
                                                    title="Đồng bộ sang MISA"
                                                >
                                                    {syncingOrder === (item.Order_ID || item.Ma_don_hang || item.id) ? <RefreshCw size={16} className="animate-spin" /> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>}
                                                </button>
                                            )}
                                            <button onClick={() => handleEdit(item)} style={{ background: 'rgba(59,130,246,0.1)', border: 'none', padding: '8px', borderRadius: '8px', color: '#3b82f6', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e=>e.currentTarget.style.transform='scale(1.1)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}><Edit2 size={16} /></button>
                                            <button onClick={() => handleDelete(item)} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', padding: '8px', borderRadius: '8px', color: '#ef4444', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e=>e.currentTarget.style.transform='scale(1.1)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}><Trash2 size={16} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </React.Fragment>
                        )) : (
                            <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>Không có dữ liệu.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {formConfig && (
                <AppSheetForm 
                    tableName={formConfig.tableName}
                    action={formConfig.action}
                    initialData={formConfig.initialData}
                    fields={formConfig.fields}
                    onClose={() => setFormConfig(null)}
                    onSuccess={(newObj) => {
                        alert("Thao tác thành công!");
                        setFormConfig(null);
                        onRefresh();
                    }}
                />
            )}
        </div>
    );
}
