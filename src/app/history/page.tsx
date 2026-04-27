'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Monitor, History, ChevronLeft, ChevronRight, Droplet, Printer, Calendar, ArrowLeft } from 'lucide-react';

interface HistoryRecord {
    id: number;
    printer_id: number;
    color: string;
    level: number;
    max_capacity: number;
    source: 'auto' | 'manual';
    remark: string;
    replaced_at: string;
    recorded_at: string;
    printer_name?: string | null;
    brand?: string | null;
    model?: string | null;
    location?: string | null;
    printer_ip?: string | null;
}

export default function HistoryPage() {
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState<HistoryRecord[]>([]);
    const [settings, setSettings] = useState({ system_title: 'Printer Monitor', system_logo: '' });

    // Date selector state
    const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);

    // Available years (current year and 2 years back)
    const years = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i);
    const months = [
        { value: 1, label: '1月' },
        { value: 2, label: '2月' },
        { value: 3, label: '3月' },
        { value: 4, label: '4月' },
        { value: 5, label: '5月' },
        { value: 6, label: '6月' },
        { value: 7, label: '7月' },
        { value: 8, label: '8月' },
        { value: 9, label: '9月' },
        { value: 10, label: '10月' },
        { value: 11, label: '11月' },
        { value: 12, label: '12月' },
    ];

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch history
            const res = await fetch(`/api/history/all?year=${selectedYear}&month=${selectedMonth}`);
            const data = await res.json();
            setHistory(data);

            // Fetch settings
            const settingsRes = await fetch('/api/settings');
            const settingsData = await settingsRes.json();
            if (settingsData.system_title) {
                setSettings(settingsData);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedYear, selectedMonth]);

    // Statistics
    const totalCount = history.length;
    const autoCount = history.filter(h => h.source === 'auto').length;
    const manualCount = history.filter(h => h.source === 'manual').length;
    const printerCount = new Set(history.map(h => h.printer_id)).size;

    // Group by printer
    const byPrinter = history.reduce((acc, record) => {
        const key = getRecordPrinterName(record);
        if (!acc[key]) acc[key] = [];
        acc[key].push(record);
        return acc;
    }, {} as Record<string, HistoryRecord[]>);

    // Group by color
    const byColor = history.reduce((acc, record) => {
        const key = getColorName(record.color);
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const formatDate = (dateStr: string) => {
        try {
            let utcDate: Date;
            if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
                utcDate = new Date(dateStr.replace(' ', 'T') + 'Z');
            } else {
                utcDate = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + ' UTC');
            }
            if (isNaN(utcDate.getTime())) return dateStr;

            return new Intl.DateTimeFormat('zh-CN', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                timeZone: 'Asia/Shanghai'
            }).format(utcDate).replace(/\//g, '-');
        } catch {
            return dateStr;
        }
    };

    const goToPrevMonth = () => {
        if (selectedMonth === 1) {
            setSelectedMonth(12);
            setSelectedYear(selectedYear - 1);
        } else {
            setSelectedMonth(selectedMonth - 1);
        }
    };

    const goToNextMonth = () => {
        if (selectedMonth === 12) {
            setSelectedMonth(1);
            setSelectedYear(selectedYear + 1);
        } else {
            setSelectedMonth(selectedMonth + 1);
        }
    };

    const isCurrentMonth = () => {
        const now = new Date();
        return selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1;
    };

    return (
        <div className="min-h-screen bg-[#f1f5f9]">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 shadow-sm">
                <div className="max-w-[1600px] mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                            <ArrowLeft size={20} className="text-slate-600" />
                        </Link>
                        {settings.system_logo ? (
                            <img src={settings.system_logo} alt="Logo" className="w-10 h-10 object-contain" />
                        ) : (
                            <div className="bg-slate-900 text-white p-2 rounded-lg shadow-sm">
                                <Monitor size={22} className="stroke-[2.5px]" />
                            </div>
                        )}
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">耗材更换记录</h1>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">
                                {settings.system_title}
                            </div>
                        </div>
                    </div>

                    <Link
                        href="/"
                        className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all shadow-sm text-base font-bold text-slate-600"
                    >
                        返回看板
                    </Link>
                </div>
            </header>

            {/* Date Selector */}
            <div className="bg-white border-b border-slate-200 px-6 py-4">
                <div className="max-w-[1600px] mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={goToPrevMonth}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <ChevronLeft size={20} className="text-slate-600" />
                        </button>
                        <div className="flex items-center gap-2">
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                className="px-3 py-2 border border-slate-200 rounded-lg font-bold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                {years.map(year => (
                                    <option key={year} value={year}>{year}年</option>
                                ))}
                            </select>
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                className="px-3 py-2 border border-slate-200 rounded-lg font-bold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                {months.map(m => (
                                    <option key={m.value} value={m.value}>{m.label}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={goToNextMonth}
                            disabled={isCurrentMonth()}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <ChevronRight size={20} className="text-slate-600" />
                        </button>
                    </div>

                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        {loading ? '加载中...' : '刷新'}
                    </button>
                </div>
            </div>

            <main className="max-w-[1600px] mx-auto p-6 md:p-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <History size={18} className="text-blue-600" />
                            </div>
                            <span className="text-sm font-medium text-slate-500">总更换次数</span>
                        </div>
                        <div className="text-3xl font-black text-slate-900">{totalCount}</div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-green-50 rounded-lg">
                                <Droplet size={18} className="text-green-600" />
                            </div>
                            <span className="text-sm font-medium text-slate-500">自动检测</span>
                        </div>
                        <div className="text-3xl font-black text-slate-900">{autoCount}</div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-orange-50 rounded-lg">
                                <Calendar size={18} className="text-orange-600" />
                            </div>
                            <span className="text-sm font-medium text-slate-500">手动记录</span>
                        </div>
                        <div className="text-3xl font-black text-slate-900">{manualCount}</div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-50 rounded-lg">
                                <Printer size={18} className="text-purple-600" />
                            </div>
                            <span className="text-sm font-medium text-slate-500">涉及打印机</span>
                        </div>
                        <div className="text-3xl font-black text-slate-900">{printerCount}</div>
                    </div>
                </div>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* By Printer */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Printer size={18} className="text-slate-400" />
                            按打印机
                        </h3>
                        {loading ? (
                            <div className="animate-pulse space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-10 bg-slate-100 rounded"></div>
                                ))}
                            </div>
                        ) : Object.keys(byPrinter).length === 0 ? (
                            <p className="text-slate-400 text-sm py-8 text-center">暂无记录</p>
                        ) : (
                            <div className="space-y-3">
                                {Object.entries(byPrinter).map(([key, records]) => (
                                    <div key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-slate-800">{getRecordPrinterName(records[0])}</div>
                                            <div className="text-xs text-slate-500">{getRecordPrinterMeta(records[0])}</div>
                                        </div>
                                        <div className="text-lg font-bold text-blue-600">{records.length}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* By Color */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Droplet size={18} className="text-slate-400" />
                            按颜色
                        </h3>
                        {loading ? (
                            <div className="animate-pulse space-y-3">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="h-10 bg-slate-100 rounded"></div>
                                ))}
                            </div>
                        ) : Object.keys(byColor).length === 0 ? (
                            <p className="text-slate-400 text-sm py-8 text-center">暂无记录</p>
                        ) : (
                            <div className="space-y-3">
                                {Object.entries(byColor).map(([color, count]) => (
                                    <div key={color} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: getColor(color) }}
                                            ></div>
                                            <span className="font-medium text-slate-800">{color}</span>
                                        </div>
                                        <div className="text-lg font-bold text-slate-600">{count}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Summary */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Calendar size={18} className="text-slate-400" />
                            {selectedYear}年{selectedMonth}月
                        </h3>
                        {loading ? (
                            <div className="animate-pulse space-y-3">
                                {[1, 2].map(i => (
                                    <div key={i} className="h-16 bg-slate-100 rounded"></div>
                                ))}
                            </div>
                        ) : totalCount === 0 ? (
                            <p className="text-slate-400 text-sm py-8 text-center">本月暂无更换记录</p>
                        ) : (
                            <div className="space-y-4">
                                <div className="text-center p-4 bg-blue-50 rounded-lg">
                                    <div className="text-4xl font-black text-blue-600">{totalCount}</div>
                                    <div className="text-sm text-blue-600/70 font-medium">次更换</div>
                                </div>
                                <div className="text-center p-4 bg-green-50 rounded-lg">
                                    <div className="text-4xl font-black text-green-600">{printerCount}</div>
                                    <div className="text-sm text-green-600/70 font-medium">台打印机</div>
                                </div>
                                <div className="text-xs text-slate-400 text-center">
                                    平均每台 {printerCount > 0 ? (totalCount / printerCount).toFixed(1) : 0} 次更换
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Detailed List */}
                <div className="mt-6 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <History size={18} className="text-slate-400" />
                        更换明细
                    </h3>
                    {loading ? (
                        <div className="animate-pulse space-y-3">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="h-16 bg-slate-100 rounded"></div>
                            ))}
                        </div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <History size={32} className="mx-auto mb-3 opacity-30" />
                            <p className="font-medium">暂无更换记录</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                        <th className="pb-3 pl-2">日期</th>
                                        <th className="pb-3">打印机</th>
                                        <th className="pb-3">位置</th>
                                        <th className="pb-3">颜色</th>
                                        <th className="pb-3">类型</th>
                                        <th className="pb-3 pr-2">备注</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map((record) => (
                                        <tr key={record.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                                            <td className="py-3 pl-2 text-sm font-medium text-slate-600">
                                                {formatDate(record.replaced_at || record.recorded_at)}
                                            </td>
                                            <td className="py-3">
                                                <div className="font-medium text-slate-800">{getRecordPrinterName(record)}</div>
                                            </td>
                                            <td className="py-3 text-sm text-slate-600">{record.location?.trim() || '-'}</td>
                                            <td className="py-3">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-2.5 h-2.5 rounded-full"
                                                        style={{ backgroundColor: getColor(record.color) }}
                                                    ></div>
                                                    <span className="text-sm font-medium text-slate-700">{getColorName(record.color)}</span>
                                                </div>
                                            </td>
                                            <td className="py-3">
                                                {record.source === 'auto' ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 bg-green-50 text-green-700 text-xs font-bold rounded border border-green-100">自动</span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded border border-blue-100">手动</span>
                                                )}
                                            </td>
                                            <td className="py-3 pr-2 text-sm text-slate-500 max-w-[200px] truncate">
                                                {record.remark || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

function getRecordPrinterName(record: HistoryRecord) {
    const explicitName = record.printer_name?.trim();
    if (explicitName) return explicitName;

    const modelName = [record.brand, record.model]
        .map(value => value?.trim())
        .filter(Boolean)
        .join(' ');
    if (modelName) return modelName;

    const location = record.location?.trim();
    if (location) return location;

    const ip = record.printer_ip?.trim();
    if (ip) return ip;

    return '未命名打印机';
}

function getRecordPrinterMeta(record: HistoryRecord) {
    const modelName = [record.brand, record.model]
        .map(value => value?.trim())
        .filter(Boolean)
        .join(' ');
    const location = record.location?.trim();

    if (modelName && modelName !== getRecordPrinterName(record) && location) {
        return `${modelName} · ${location}`;
    }
    if (location && location !== getRecordPrinterName(record)) return location;
    if (record.printer_ip?.trim()) return record.printer_ip.trim();
    return '无位置信息';
}

function getColor(name: string) {
    const lower = name.toLowerCase();
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
    return name;
}
