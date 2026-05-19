import React, { useState } from 'react';
import { mutateAppSheetData } from '../../services/appsheet';

export default function AppSheetForm({ tableName, action, initialData = {}, fields = [], onClose, onSuccess }) {
    const [formData, setFormData] = useState(initialData);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        try {
            const res = await mutateAppSheetData(tableName, action, formData);
            if (res.success) {
                if (onSuccess) onSuccess(res.data);
                else onClose();
            } else {
                setError(res.error || 'Có lỗi xảy ra khi lưu trên AppSheet.');
                // Xử lý tạm trên UI cho Demo nếu Lỗi API (vì API khóa hoặc thiếu quyền Add)
                if (window.confirm('Không thể đẩy dữ liệu lên AppSheet thật. Bạn có muốn lưu tạm trên UI (Demo) không?')) {
                     if (onSuccess) onSuccess({ ...formData, _isDemo: true });
                     else onClose();
                }
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
        }}>
            <div className="glass-panel custom-scrollbar" style={{ 
                background: 'white', borderRadius: '16px', width: '100%', 
                maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' 
            }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-glass)' }}>
                    <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>
                        {action === 'Add' ? 'Thêm Mới' : 'Cập Nhật'} {tableName}
                    </h3>
                    <button onClick={onClose} style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer' }}>&times;</button>
                </div>
                
                <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
                    {error && (
                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
                            {error}
                        </div>
                    )}
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                        {fields.map(field => (
                            <div key={field.name} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                                    {field.label} {field.required && <span style={{color: '#ef4444'}}>*</span>}
                                </label>
                                {field.type === 'select' ? (
                                    <select
                                        name={field.name}
                                        value={formData[field.name] || ''}
                                        onChange={handleChange}
                                        required={field.required}
                                        style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-glass)', outline: 'none' }}
                                    >
                                        <option value="">-- Chọn --</option>
                                        {field.options.map(opt => <option key={opt.value||opt} value={opt.value||opt}>{opt.label||opt}</option>)}
                                    </select>
                                ) : (
                                    <input
                                        type={field.type || 'text'}
                                        name={field.name}
                                        value={formData[field.name] || ''}
                                        onChange={handleChange}
                                        required={field.required}
                                        style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-glass)', outline: 'none' }}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                    
                    <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button type="button" onClick={onClose} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'transparent', cursor: 'pointer' }}>
                            Hủy
                        </button>
                        <button type="submit" disabled={loading} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: 'white', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}>
                            {loading ? 'Đang lưu...' : 'Lưu dữ liệu'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
