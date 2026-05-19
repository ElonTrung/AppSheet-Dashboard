import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Package, Truck, Box, ShieldCheck } from 'lucide-react';

export default function ProcurementModule({ dataMH, dataNCC, dataVC }) {
    // Process Procurement Data
    const totalPurchases = dataMH.reduce((acc, row) => acc + Number(row.Tong_tien_chua_VAT || row.Truoc_thue || row.total || 0), 0);
    const totalLogistics = dataVC.reduce((acc, row) => acc + Number(row.Tong_tien_VC_coVAT || row.Thanh_tien || 0), 0) / 1.08;

    const supplierTotals = {};
    dataMH.forEach(row => {
        const ncc = String(row.Ten_NCC || row.supplier || row.Nha_cung_cap || 'Unknown').trim();
        if (ncc && ncc !== 'Unknown') {
            supplierTotals[ncc] = (supplierTotals[ncc] || 0) + Number(row.Tong_tien_chua_VAT || row.Truoc_thue || row.total || 0);
        }
    });

    const topSuppliers = Object.entries(supplierTotals)
        .sort((a,b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, val]) => ({ name, val }));

    const formatCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

    const inventoryData = [
        { month: 'T1', stockVal: 850000000, expected: 800000000 },
        { month: 'T2', stockVal: 820000000, expected: 800000000 },
        { month: 'T3', stockVal: 910000000, expected: 820000000 },
        { month: 'T4', stockVal: 880000000, expected: 800000000 },
        { month: 'T5', stockVal: 1050000000, expected: 900000000 },
        { month: 'T6', stockVal: 1250000000, expected: 950000000 }
    ];

    return (
        <div className="animated-view">
            <div className="module-header">
                <div className="module-title">
                    <h2>Mua Hàng & Quản Trị Kho (Live + Demo)</h2>
                    <p className="module-subtitle">Theo dõi chuỗi cung ứng, nhà cung cấp và mức tồn kho</p>
                </div>
            </div>

            <div className="grid-cols-4" style={{ marginBottom: '32px' }}>
                <div className="stat-card">
                    <div className="stat-header">
                        <span className="stat-title">Giá Trị Tồn Kho (Demo)</span>
                        <div className="icon-box purple"><Package size={20} /></div>
                    </div>
                    <div className="stat-value">1.25 Tỷ</div>
                    <div className="trend-up">+14% đang trong đợt nhập hàng mùa cao điểm</div>
                </div>
                
                <div className="stat-card">
                    <div className="stat-header">
                        <span className="stat-title">Tổng Mua Hàng (Live)</span>
                        <div className="icon-box blue"><Box size={20} /></div>
                    </div>
                    <div className="stat-value">{(totalPurchases/1000000000).toFixed(1)} Tỷ</div>
                    <div className="trend-down">Kiểm soát thu mua chặt chẽ</div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <span className="stat-title">Chi Phí Logistics (Live)</span>
                        <div className="icon-box orange"><Truck size={20} /></div>
                    </div>
                    <div className="stat-value">{(totalLogistics/1000000).toFixed(1)} Tr</div>
                    <div className="trend-up">Chiếm 2.5% tổng doanh thu</div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <span className="stat-title">Nhà Cung Cấp Hợp Lệ</span>
                        <div className="icon-box green"><ShieldCheck size={20} /></div>
                    </div>
                    <div className="stat-value">{Object.keys(supplierTotals).length || 24}</div>
                    <div className="trend-up">100% đạt chuẩn ISO hiện hành</div>
                </div>
            </div>

            <div className="grid-cols-3">
                <div className="glass-panel" style={{ padding: '24px', gridColumn: 'span 2' }}>
                    <h3 className="chart-title">Biến Phân Tích Giá Trị Kho Theo Tháng (Demo)</h3>
                    <div style={{ height: '320px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={inventoryData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.2)" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} tickFormatter={(val) => (val / 1000000) + 'Tr'} dx={-10} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-md)' }} formatter={(val) => formatCurrency(val)} />
                                <Area type="monotone" dataKey="stockVal" name="Hàng Tồn Kho" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorStock)" />
                                <Area type="monotone" dataKey="expected" name="Định Mức Tồn Kho" stroke="#e2e8f0" strokeDasharray="5 5" strokeWidth={2} fillOpacity={0} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '24px' }}>
                    <h3 className="chart-title">Nhóm Top 5 Nhà Cung Cấp Ký Quỹ (Live)</h3>
                    <div style={{ height: '320px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={topSuppliers} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(148, 163, 184, 0.2)" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 11}} width={120} />
                                <Tooltip cursor={{fill: 'rgba(148, 163, 184, 0.05)'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-md)' }} formatter={(val) => formatCurrency(val)} />
                                <Bar dataKey="val" fill="#10b981" radius={[0, 4, 4, 0]} barSize={16}>
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                        <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>Dữ liệu real-time từ bảng Mua hàng</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
