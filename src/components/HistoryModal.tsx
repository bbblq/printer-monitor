'use client';

import React, { useEffect, useState } from 'react';
import { X, History, Droplet, User, Save, Plus } from 'lucide-react';
import { Printer } from '@/lib/types';

interface HistoryRecord {
    id: number;
    color: string;
    remark: string;
    source: 'auto' | 'manual';
    recorded_at: string;
}

interface HistoryModalProps {
    printer: Printer;
    onClose: () => void;
    readOnly?: boolean;
}

export function HistoryModal({ printer, onClose, readOnly = false }: HistoryModalProps) {
    const [history, setHistory] = useState<HistoryRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);

    // Add Form State
    const [newColor, setNewColor] = useState('Black');
    const [newRemark, setNewRemark] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [timezone, setTimezone] = useState('browser');

    const fetchHistory = async () => {
        setLoading(true);
        try {
            // Fetch settings
            const settingsRes = await fetch('/api/admin/settings');
            const settings = await settingsRes.json();
            if (settings.timezone) setTimezone(settings.timezone);

            // Fetch history
            const res = await fetch(`/api/history?printerId=${printer.id}`);
            const data = await res.json();
            setHistory(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [printer.id]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await fetch('/api/history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'add_history',
                    printerId: printer.id,
                    color: newColor,
                    remark: newRemark,
                    level: 100, // Default to full
                    maxCapacity: 100,
                    source: 'manual'
                })
            });
            setIsAdding(false);
            setNewRemark('');
            fetchHistory();
        } catch (e) {
            console.error(e);
            alert('添加失败');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('确认删除这条记录吗？')) return;
        await fetch(`/api/history?id=${id}`, { method: 'DELETE' });
        fetchHistory();
    };

    // Format date in Beijing timezone
    const formatDate = (dateStr: string) => {
        const utcDate = new Date(dateStr + ' UTC');

        if (timezone === 'UTC') {
            return utcDate.toISOString().replace('T', ' ').substring(0, 16) + ' UTC';
        }

        if (timezone === 'Asia/Shanghai') {
            return new Intl.DateTimeFormat('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                timeZone: 'Asia/Shanghai'
            }).format(utcDate).replace(/\//g, '/');
        }

        const year = utcDate.getFullYear();
        const month = String(utcDate.getMonth() + 1).padStart(2, '0');
        const day = String(utcDate.getDate()).padStart(2, '0');
        const hours = String(utcDate.getHours()).padStart(2, '0');
        const minutes = String(utcDate.getMinutes()).padStart(2, '0');
        return `${year}/${month}/${day} ${hours}:${minutes}`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 rounded-xl">
                {/* Header */}
                <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900">
                            <History className="text-blue-600" />
                            更换记录
                        </h2>
                        <p className="text-slate-600 text-sm mt-1">
                            {printer.brand} {printer.model} - {printer.location}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-600 hover:text-slate-900">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">

                    {/* Add Button / Form - Only show if not readOnly */}
                    {!readOnly && (
                        !isAdding ? (
                            <div className="mb-6 flex justify-end">
                                <button
                                    onClick={() => setIsAdding(true)}
                                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm active:scale-95 transition-all text-sm"
                                >
                                    <Plus size={16} />
                                    手动记录更换
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleAdd} className="mb-6 bg-white p-5 rounded-xl border border-blue-100 shadow-sm animate-in slide-in-from-top-2">
                                <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider">新增更换记录</h3>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-slate-600 text-sm font-medium mb-1.5">更换颜色</label>
                                        <select
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={newColor}
                                            onChange={e => setNewColor(e.target.value)}
                                        >
                                            <option value="Black">黑色 (Black)</option>
                                            <option value="Cyan">青色 (Cyan)</option>
                                            <option value="Magenta">品红 (Magenta)</option>
                                            <option value="Yellow">黄色 (Yellow)</option>
                                            <option value="Waste Toner">废粉盒</option>
                                            <option value="Other">其他</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-slate-600 text-sm font-medium mb-1.5">备注 (选填)</label>
                                        <input
                                            type="text"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="例如：原装墨粉"
                                            value={newRemark}
                                            onChange={e => setNewRemark(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsAdding(false)}
                                        className="px-3 py-2 text-slate-500 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        取消
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-all"
                                    >
                                        <Save size={16} />
                                        {submitting ? '提交中...' : '确认添加'}
                                    </button>
                                </div>
                            </form>
                        )
                    )}

                    {loading ? (
                        <div className="flex justify-center items-center h-32 text-slate-500">
                            加载中...
                        </div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-12 text-slate-600 border-2 border-dashed border-slate-300 rounded-lg bg-white/50">
                            <p className="font-medium">暂无更换记录</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {history.map((record) => (
                                <div key={record.id} className="relative group flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg bg-white border border-slate-200 hover:border-blue-200 hover:shadow-sm transition-all">
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="p-3 rounded-full bg-slate-50 border border-slate-100 flex-shrink-0">
                                            <Droplet size={20} style={{ color: getColor(record.color) }} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-800 flex items-center gap-2">
                                                {getColorName(record.color)}
                                                {record.source === 'manual' && (
                                                    <span className="bg-blue-50 text-blue-600 text-[10px] px-1.5 py-0.5 rounded border border-blue-100 uppercase tracking-wide font-bold">手动</span>
                                                )}
                                            </div>
                                            <div className="text-sm text-slate-500 mt-1 flex flex-wrap items-center gap-x-3">
                                                <span>{formatDate(record.recorded_at)}</span>
                                                {record.remark && (
                                                    <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs border border-slate-200 max-w-[200px] truncate" title={record.remark}>
                                                        {record.remark}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {!readOnly && (
                                        <button
                                            onClick={() => handleDelete(record.id)}
                                            className="absolute top-2 right-2 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                            title="删除"
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function getColor(name: string) {
    const lower = name.toLowerCase();
    // Check Black first because 'black' contains 'c' which might false trigger cyan if checked loosely
    if (lower.includes('black') || lower.includes('黑') || lower.includes('k')) return '#1e293b';
    if (lower.includes('cyan') || lower.includes('青') || (lower.includes('c') && !lower.includes('black'))) return '#06b6d4';
    if (lower.includes('magenta') || lower.includes('品') || lower.includes('m')) return '#d946ef';
    if (lower.includes('yellow') || lower.includes('黄') || lower.includes('y')) return '#eab308';
    if (lower.includes('waste')) return '#9ca3af';
    return '#64748b';
}

function getColorName(name: string) {
    const lower = name.toLowerCase();
    if (lower.includes('black') || lower.includes('黑') || lower.includes('k')) return '黑色';
    if (lower.includes('cyan') || lower.includes('青') || (lower.includes('c') && !lower.includes('black'))) return '青色';
    if (lower.includes('magenta') || lower.includes('品') || lower.includes('m')) return '品红';
    if (lower.includes('yellow') || lower.includes('黄') || lower.includes('y')) return '黄色';
    if (lower.includes('waste')) return '废粉盒';
    return name; // Fallback
}
