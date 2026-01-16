'use client';

import React, { useEffect, useState } from 'react';
import { X, History, Droplet, Cpu, User } from 'lucide-react';
import { Printer } from '@/lib/types';

interface HistoryRecord {
    id: number;
    color: string;
    level: number;
    max_capacity: number;
    source: 'auto' | 'manual';
    recorded_at: string;
}

interface HistoryModalProps {
    printer: Printer;
    onClose: () => void;
}

export function HistoryModal({ printer, onClose }: HistoryModalProps) {
    const [history, setHistory] = useState<HistoryRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/printers/${printer.id}/history`)
            .then(res => res.json())
            .then(data => {
                setHistory(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [printer.id]);

    // Format date in Beijing timezone
    const formatDate = (dateStr: string) => {
        // SQLite CURRENT_TIMESTAMP 返回 UTC 时间，格式如 "2026-01-16 06:54:46"
        // 添加 ' UTC' 后缀让 JavaScript 正确解析为 UTC 时间
        const utcDate = new Date(dateStr + ' UTC');

        const year = utcDate.getFullYear();
        const month = String(utcDate.getMonth() + 1).padStart(2, '0');
        const day = String(utcDate.getDate()).padStart(2, '0');

        return `${year}/${month}/${day}`;
    };

    const formatTime = (dateStr: string) => {
        // SQLite CURRENT_TIMESTAMP 返回 UTC 时间，格式如 "2026-01-16 06:54:46"
        // 添加 ' UTC' 后缀让 JavaScript 正确解析为 UTC 时间
        const utcDate = new Date(dateStr + ' UTC');

        const hours = String(utcDate.getHours()).padStart(2, '0');
        const minutes = String(utcDate.getMinutes()).padStart(2, '0');
        const seconds = String(utcDate.getSeconds()).padStart(2, '0');

        return `${hours}:${minutes}:${seconds}`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl max-h-[80vh] flex flex-col p-0 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 rounded-xl">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
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

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                    {loading ? (
                        <div className="flex justify-center items-center h-32 text-slate-500">
                            加载中...
                        </div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-12 text-slate-600 border-2 border-dashed border-slate-300 rounded-lg bg-white">
                            <p className="font-medium">暂无更换记录</p>
                            <p className="text-xs mt-2 text-slate-500">当墨粉量显著增加时会自动记录</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {history.map((record) => (
                                <div key={record.id} className="flex items-center gap-4 p-4 rounded-lg bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all">
                                    <div className="p-3 rounded-full bg-slate-100 border border-slate-200">
                                        <Droplet size={20} style={{ color: getColor(record.color) }} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-semibold text-lg text-slate-900">{record.color}</div>
                                        <div className="text-slate-600 text-sm flex items-center gap-2 mt-1">
                                            <span>墨粉量: {record.max_capacity > 0 ? Math.round((record.level / record.max_capacity) * 100) : '?'}%</span>
                                            <span className="text-slate-400">•</span>
                                            <span className="flex items-center gap-1">
                                                {record.source === 'auto' ? (
                                                    <>
                                                        <Cpu size={14} className="text-green-600" />
                                                        <span className="text-green-700 font-medium">系统扫描</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <User size={14} className="text-blue-600" />
                                                        <span className="text-blue-700 font-medium">手动添加</span>
                                                    </>
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-semibold text-slate-800">
                                            {formatDate(record.recorded_at)}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">
                                            {formatTime(record.recorded_at)}
                                        </div>
                                    </div>
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
    if (lower.includes('cyan') || lower.includes('c')) return '#06b6d4';
    if (lower.includes('magenta') || lower.includes('m')) return '#d946ef';
    if (lower.includes('yellow') || lower.includes('y')) return '#eab308';
    if (lower.includes('black') || lower.includes('k') || lower.includes('黑')) return '#1e293b';
    return '#64748b';
}
