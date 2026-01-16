'use client';

import React, { useState, useEffect } from 'react';
import { Save, Settings, Image as ImageIcon, Clock, Lock } from 'lucide-react';

export function SystemSettings() {
    const [settings, setSettings] = useState({
        system_title: '',
        system_logo: '',
        refresh_interval: '15',
        admin_password: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/admin/settings');
            const data = await res.json();
            setSettings({
                system_title: data.system_title || 'Printer Monitor',
                system_logo: data.system_logo || '',
                refresh_interval: data.refresh_interval || '15',
                admin_password: data.admin_password || ''
            });
        } catch (e) {
            console.error('Failed to fetch settings', e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            const res = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });

            if (res.ok) {
                setMessage({ type: 'success', text: '设置已保存' });
                setTimeout(() => setMessage(null), 3000);
            } else {
                throw new Error('Failed to save');
            }
        } catch (e) {
            setMessage({ type: 'error', text: '保存失败' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-4 text-slate-400">正在加载设置...</div>;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
            <div className="flex items-center gap-2 mb-6 text-slate-800 font-bold text-lg">
                <Settings size={20} className="text-blue-600" />
                <h2>系统配置</h2>
            </div>

            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                        系统标题
                    </label>
                    <input
                        type="text"
                        value={settings.system_title}
                        onChange={e => setSettings({ ...settings, system_title: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="例如: Printer Monitor"
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                        <ImageIcon size={16} className="text-slate-400" />
                        Logo 图片地址
                    </label>
                    <input
                        type="text"
                        value={settings.system_logo}
                        onChange={e => setSettings({ ...settings, system_logo: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="http://... 或 base64"
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                        <Clock size={16} className="text-slate-400" />
                        读取频率 (分钟)
                    </label>
                    <select
                        value={settings.refresh_interval}
                        onChange={e => setSettings({ ...settings, refresh_interval: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none bg-white"
                    >
                        <option value="5">5 分钟</option>
                        <option value="10">10 分钟</option>
                        <option value="15">15 分钟</option>
                        <option value="30">30 分钟</option>
                        <option value="60">60 分钟</option>
                        <option value="120">120 分钟</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                        <Lock size={16} className="text-slate-400" />
                        后台密码
                    </label>
                    <input
                        type="text"
                        value={settings.admin_password}
                        onChange={e => setSettings({ ...settings, admin_password: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono"
                        placeholder="admin"
                    />
                </div>

                <div className="md:col-span-3 flex items-center justify-between pt-2">
                    <div className="text-sm">
                        {message && (
                            <span className={message.type === 'success' ? 'text-emerald-600' : 'text-red-600'}>
                                {message.text}
                            </span>
                        )}
                    </div>
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-2 rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50"
                    >
                        <Save size={18} />
                        {saving ? '正在保存...' : '保存设置'}
                    </button>
                </div>
            </form>
        </div>
    );
}
