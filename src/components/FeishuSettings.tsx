
'use client';

import { useState, useEffect } from 'react';
import { Save, Send, ShieldCheck, Bell, RefreshCw, Calendar, Eye, EyeOff } from 'lucide-react';

export function FeishuSettings() {
    const [config, setConfig] = useState({
        webhook: '',
        enabled: false,
        notify_low: true,
        notify_replacement: true,
        notify_daily: false,
        daily_time: '09:00'
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [showWebhook, setShowWebhook] = useState(false);

    useEffect(() => {
        fetch('/api/admin/settings')
            .then(res => res.json())
            .then(data => {
                setConfig({
                    webhook: data.feishu_webhook_url || '',
                    enabled: data.feishu_enabled === '1',
                    notify_low: data.feishu_notify_low !== '0', // Default true unless explicitly '0'
                    notify_replacement: data.feishu_notify_replacement !== '0',
                    notify_daily: data.feishu_notify_daily === '1',
                    daily_time: data.feishu_daily_time || '09:00'
                });
                setLoading(false);
            });
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const body = {
                feishu_webhook_url: config.webhook,
                feishu_enabled: config.enabled ? '1' : '0',
                feishu_notify_low: config.notify_low ? '1' : '0',
                feishu_notify_replacement: config.notify_replacement ? '1' : '0',
                feishu_notify_daily: config.notify_daily ? '1' : '0',
                feishu_daily_time: config.daily_time
            };

            const res = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                alert('保存成功');
            } else {
                alert('保存失败');
            }
        } catch (e) {
            console.error(e);
            alert('发生错误');
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async () => {
        // First save current config (or warn user?) Let's just use current state but backend uses DB state.
        // Usually should save first.
        if (!confirm('发送测试消息前请先保存配置，是否继续？')) return;

        setTesting(true);
        try {
            // First save (auto-save before test)
            const body = {
                feishu_webhook_url: config.webhook,
                // ... (Must save enabled state too to ensure backend picks it up?)
                // Actually backend checks DB. So we MUST save first.
                feishu_enabled: '1', // Temporarily enable for test? No, respect config.
                // If not enabled, test might fail in backend logic if we check there.
            };
            // Let's just call the save logic first.
            await fetch('/api/admin/settings', {
                method: 'POST',
                body: JSON.stringify({
                    feishu_webhook_url: config.webhook,
                    feishu_enabled: config.enabled ? '1' : '0',
                }) // minimal save
            });

            const res = await fetch('/api/admin/feishu/test', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                alert('测试消息已发送，请检查飞书群组。');
            } else {
                alert('发送失败: ' + (data.error || '未知错误'));
            }
        } catch (e) {
            alert('请求失败');
        } finally {
            setTesting(false);
        }
    };

    if (loading) return <div>加载中...</div>;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-600 p-1.5 rounded-lg">
                    <Send size={20} />
                </span>
                飞书通知配置
            </h2>

            <div className="space-y-6">
                {/* 启用开关 */}
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">启用飞书机器人</label>
                    <button
                        onClick={() => setConfig({ ...config, enabled: !config.enabled })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.enabled ? 'bg-blue-600' : 'bg-slate-200'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>

                {/* Webhook URL */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Webhook 地址</label>
                    <div className="relative">
                        <input
                            type={showWebhook ? "text" : "password"}
                            value={config.webhook}
                            onChange={(e) => setConfig({ ...config, webhook: e.target.value })}
                            placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..."
                            className="w-full pl-3 pr-10 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-sm"
                        />
                        <button
                            type="button"
                            onClick={() => setShowWebhook(!showWebhook)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors"
                            title={showWebhook ? "隐藏地址" : "显示地址"}
                        >
                            {showWebhook ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-600">提示</span>
                        请在飞书群组设置中添加“自定义机器人”，并复制 Webhook 地址。
                    </p>
                </div>

                <div className="border-t border-slate-100 pt-4 space-y-4">
                    <h3 className="text-sm font-semibold text-slate-900">通知类型</h3>

                    {/* 低墨预警 */}
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            checked={config.notify_low}
                            onChange={(e) => setConfig({ ...config, notify_low: e.target.checked })}
                            id="notify_low"
                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        />
                        <label htmlFor="notify_low" className="text-sm text-slate-700 flex items-center gap-2">
                            <Bell size={16} className="text-orange-500" />
                            低墨/耗尽预警 (小于 10% 或 耗尽)
                        </label>
                    </div>

                    {/* 更换记录 */}
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            checked={config.notify_replacement}
                            onChange={(e) => setConfig({ ...config, notify_replacement: e.target.checked })}
                            id="notify_replacement"
                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        />
                        <label htmlFor="notify_replacement" className="text-sm text-slate-700 flex items-center gap-2">
                            <RefreshCw size={16} className="text-green-500" />
                            耗材更换通知
                        </label>
                    </div>

                    {/* 日报 */}
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            checked={config.notify_daily}
                            onChange={(e) => setConfig({ ...config, notify_daily: e.target.checked })}
                            id="notify_daily"
                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        />
                        <label htmlFor="notify_daily" className="text-sm text-slate-700 flex items-center gap-2">
                            <Calendar size={16} className="text-blue-500" />
                            每日自动报表
                        </label>
                    </div>

                    {/* 日报时间 */}
                    {config.notify_daily && (
                        <div className="pl-7 mt-2 flex items-center gap-2">
                            <span className="text-sm text-slate-600">发送时间:</span>
                            <input
                                type="time"
                                value={config.daily_time}
                                onChange={(e) => setConfig({ ...config, daily_time: e.target.value })}
                                className="px-2 py-1 border border-slate-300 rounded text-sm"
                            />
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                        onClick={handleTest}
                        disabled={testing || !config.webhook}
                        className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        {testing ? '发送中...' : '发送测试消息'}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        <Save size={16} />
                        {saving ? '保存中...' : '保存配置'}
                    </button>
                </div>
            </div>
        </div>
    );
}
