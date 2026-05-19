import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CreditCard, DollarSign, PieChart, Wallet } from 'lucide-react';

export default function FinanceModule({ dataDGC, dataDH }) {
    const formatCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

    const cashflowData = [
        { month: 'T1', in: 120000000, out: 80000000 },
        { month: 'T2', in: 150000000, out: 95000000 },
        { month: 'T3', in: 180000000, out: 120000000 },
        { month: 'T4', in: 140000000, out: 130000000 },
        { month: 'T5', in: 210000000, out: 110000000 },
        { month: 'T6', in: 250000000, out: 140000000 }
    ];

    const arData = [
        { client: 'Công Ty CP Xây Dựng Số 1', amount: 125000000, days: 45, status: 'Quá hạn' },
        { client: 'Tập Đoàn Hòa Phát', amount: 80000000, days: 15, status: 'Hợp lệ' },
        { client: 'Cửa Hàng VLXD Tuấn Anh', amount: 45000000, days: 65, status: 'Rủi ro' },
        { client: 'Dự án Cầu Vàng', amount: 210000000, days: 5, status: 'Hợp lệ' }
    ];

    return (
        <div className="animated-view">
            <div className="module-header">
                <div className="module-title">
                    <h2>Tài Chính & Dòng Tiền (Demo)</h2>
                    <p className="module-subtitle">Kiểm soát dòng tiền In/Out và tình trạng công nợ</p>
                </div>
            </div>

            <div className="grid-cols-4" style={{ marginBottom: '32px' }}>
                <div className="stat-card">
                    <div className="stat-header">
                        <span className="stat-title">Quỹ tiền mặt (Cash)</span>
                        <div className="icon-box green"><Wallet size={20} /></div>
                    </div>
                    <div className="stat-value">254.5 Tr</div>
                    <div className="trend-up">+14% thanh khoản tốt</div>
                </div>
                
                <div className="stat-card">
                    <div className="stat-header">
                        <span className="stat-title">Doanh Thu Cần Thu (AR)</span>
                        <div className="icon-box blue"><DollarSign size={20} /></div>
                    </div>
                    <div className="stat-value">460.0 Tr</div>
                    <div className="trend-down">3 khoản đang quá hạn hạn</div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <span className="stat-title">Nợ Phải Trả (AP)</span>
                        <div className="icon-box orange"><CreditCard size={20} /></div>
                    </div>
                    <div className="stat-value">120.5 Tr</div>
                    <div className="trend-up">Thanh toán đúng hạn 100%</div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <span className="stat-title">Chi Phí HĐ (Opex)</span>
                        <div className="icon-box purple"><PieChart size={20} /></div>
                    </div>
                    <div className="stat-value">84.2 Tr</div>
                    <div className="trend-up">Thấp hơn định mức 5%</div>
                </div>
            </div>

            <div className="grid-cols-3">
                <div className="glass-panel" style={{ padding: '24px', gridColumn: 'span 2' }}>
                    <h3 className="chart-title">Dòng Tiền Ra - Vào (Inflow / Outflow)</h3>
                    <div style={{ height: '320px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={cashflowData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.2)" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} tickFormatter={(val) => (val / 1000000) + 'Tr'} dx={-10} />
                                <Tooltip cursor={{fill: 'rgba(148, 163, 184, 0.05)'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-md)' }} formatter={(val) => formatCurrency(val)} />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Bar dataKey="in" name="Dòng Tiền Vào" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} />
                                <Bar dataKey="out" name="Dòng Tiền Ra" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '24px' }}>
                    <h3 className="chart-title" style={{ color: '#ef4444' }}>Cảnh Báo Công Nợ Khách Hàng (AR)</h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table" style={{ marginTop: 0 }}>
                            <thead>
                                <tr>
                                    <th style={{ padding: '8px 12px' }}>Khách hàng</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Số Nợ</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Khuyên Dùng</th>
                                </tr>
                            </thead>
                            <tbody>
                                {arData.map((row, idx) => (
                                    <tr key={idx} style={{ background: row.days > 60 ? 'rgba(239, 68, 68, 0.05)' : row.days > 30 ? 'rgba(245, 158, 11, 0.05)' : 'white' }}>
                                        <td style={{ padding: '12px', fontWeight: 600, fontSize: '13px' }}>{row.client}</td>
                                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)', fontSize: '13px' }}>
                                            {(row.amount / 1000000).toFixed(1)} Tr
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'right' }}>
                                            <span className={`status-badge status-${row.status === 'Hợp lệ' ? 'completed' : row.status === 'Quá hạn' ? 'pending' : 'failed'}`} style={{ fontSize: '10px', padding: '4px 8px' }}>
                                                {row.status}
                                            </span>
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
