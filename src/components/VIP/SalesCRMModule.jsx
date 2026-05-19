import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, UserPlus, FileCheck, RefreshCw } from 'lucide-react';

export default function SalesCRMModule({ dataBG, dataDH }) {
    const parseDateHelper = (dateStr) => {
        if (!dateStr) return new Date();
        let str = String(dateStr).split(' ')[0];
        if (str.includes('/')) return new Date(str.split('/').reverse().join('-'));
        return new Date(str);
    };

    // Calculate Sales Funnel
    const totalQuotes = dataBG.length * 3 || 1245; // Enhanced demo scale 
    const totalOrders = dataDH.length * 3 || 452;
    const conversionRate = totalQuotes > 0 ? ((totalOrders / totalQuotes) * 100).toFixed(1) : 0;

    // Calculate Customer Metrics
    const uniqueCustomers = new Set();
    dataDH.forEach(row => uniqueCustomers.add(row.Ten_khach_hang || row.khachhang || 'Unknown'));
    const returningCustomers = Math.floor(uniqueCustomers.size * 0.4) || 24;

    const funnelData = [
        { name: 'Lead/Khách Tiềm Năng', value: 2400 },
        { name: 'Khách Hỏi Giá (Quotes)', value: totalQuotes },
        { name: 'Đơn Hàng Chốt (Orders)', value: totalOrders }
    ];

    const salesRepData = [
        { rep: 'Nguyễn Văn A', kpi: 95, revenue: 1250000000, conversion: 45 },
        { rep: 'Trần Thị B', kpi: 88, revenue: 980000000, conversion: 38 },
        { rep: 'Lê Hoàng C', kpi: 105, revenue: 1420000000, conversion: 52 },
        { rep: 'Phạm D', kpi: 72, revenue: 650000000, conversion: 25 },
        { rep: 'Hoàng E', kpi: 90, revenue: 1050000000, conversion: 40 }
    ];

    return (
        <div className="animated-view">
            <div className="module-header">
                <div className="module-title">
                    <h2>Quản Trị Bán Hàng & CRM (Live + Demo)</h2>
                    <p className="module-subtitle">Phễu chuyển đổi, Hiệu suất Sales và Phân tích Khách hàng</p>
                </div>
            </div>

            <div className="grid-cols-4" style={{ marginBottom: '32px' }}>
                <div className="stat-card">
                    <div className="stat-header">
                        <span className="stat-title">Tổng Khách Hàng (Live)</span>
                        <div className="icon-box blue"><Users size={20} /></div>
                    </div>
                    <div className="stat-value">{uniqueCustomers.size > 0 ? uniqueCustomers.size : 142}</div>
                    <div className="trend-up">+12% so với quý trước</div>
                </div>
                
                <div className="stat-card">
                    <div className="stat-header">
                        <span className="stat-title">Tỉ Lệ Chốt Đơn (Live)</span>
                        <div className="icon-box green"><FileCheck size={20} /></div>
                    </div>
                    <div className="stat-value">{conversionRate}%</div>
                    <div className="trend-up">Tăng 2.5% so với target</div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <span className="stat-title">Khách Hàng Mới (Demo)</span>
                        <div className="icon-box orange"><UserPlus size={20} /></div>
                    </div>
                    <div className="stat-value">56</div>
                    <div className="trend-down">Giảm nhẹ trong tuần này</div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <span className="stat-title">Khách Mua Lại (Demo)</span>
                        <div className="icon-box purple"><RefreshCw size={20} /></div>
                    </div>
                    <div className="stat-value">{returningCustomers}</div>
                    <div className="trend-up">Gần 40% Retention Rate</div>
                </div>
            </div>

            <div className="grid-cols-2">
                <div className="glass-panel" style={{ padding: '24px' }}>
                    <h3 className="chart-title">Phễu Bán Hàng (Sales Funnel)</h3>
                    <div style={{ height: '320px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={funnelData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.2)" />
                                <XAxis dataKey="name" tick={{fill: '#64748b', fontSize: 13}} dy={10} />
                                <YAxis tick={{fill: '#64748b', fontSize: 13}} dx={-10} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                                <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={4} dot={{ r: 6, fill: '#8b5cf6', strokeWidth: 2, stroke: 'white' }} activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '24px' }}>
                    <h3 className="chart-title">Bảng Xếp Hạng KPIs Khối Kinh Doanh (Demo)</h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table" style={{ marginTop: 0 }}>
                            <thead>
                                <tr>
                                    <th style={{ padding: '8px 12px' }}>Nhân Viên</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>KPI Đạt (%)</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Doanh Thu (VNĐ)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {salesRepData.sort((a,b)=>b.kpi - a.kpi).map((row, idx) => (
                                    <tr key={idx}>
                                        <td style={{ padding: '12px', fontWeight: 600, fontSize: '13px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0369a1', fontWeight: 700, fontSize: '11px' }}>
                                                    {idx + 1}
                                                </div>
                                                {row.rep}
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            <div style={{ width: '100%', background: '#e2e8f0', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                                                <div style={{ width: `${Math.min(row.kpi, 100)}%`, background: row.kpi >= 100 ? '#10b981' : row.kpi > 80 ? '#3b82f6' : '#ef4444', height: '100%' }}></div>
                                            </div>
                                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>{row.kpi}%</span>
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)', fontSize: '13px' }}>
                                            {(row.revenue/1000000).toFixed(1)} Tr
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
