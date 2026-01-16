'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Cpu, User, History } from 'lucide-react';

interface Printer {
    id: number;
    name: string;
    brand: string;
    model: string;
    location: string;
}

interface HistoryRecord {
    id: number;
    color: string;
    level: number;
    max_capacity: number;
    source: 'auto' | 'manual';
    recorded_at: string;
}

export default function HistoryManagementPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const printerId = parseInt(id);

    const [printer, setPrinter] = useState<Printer | null>(null);
    const [history, setHistory] = useState<HistoryRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    // Form state
    const [color, setColor] = useState('');
    const [level, setLevel] = useState('100');
    const [maxCapacity, setMaxCapacity] = useState('100');

    useEffect(() => {
        fetchData();
    }, [printerId]);

    const fetchData = async () => {
        try {
            // Fetch printer info
            const printersRes = await fetch('/api/printers');
            const printers = await printersRes.json();
            const currentPrinter = printers.find((p: Printer) => p.id === printerId);
            setPrinter(currentPrinter);

            // Fetch history
            const historyRes = await fetch(`/api/printers/${printerId}/history`);
            const historyData = await historyRes.json();
            setHistory(historyData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!color.trim()) {
            alert('请输入墨盒颜色');
            return;
        }

        await fetch(`/api/printers/${printerId}/history`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'add',
                color,
                level: parseInt(level),
                maxCapacity: parseInt(maxCapacity)
            })
        });

        setShowAddModal(false);
        setColor('');
        setLevel('100');
        setMaxCapacity('100');
        fetchData();
    };

    const handleDelete = async (historyId: number) => {
        if (!confirm('确认删除该记录吗？')) return;

        await fetch(`/api/printers/${printerId}/history`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'delete',
                historyId
            })
        });

        fetchData();
    };

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

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-slate-600">加载中...</div>
            </div>
        );
    }

    if (!printer) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-slate-600">打印机不存在</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/admin')}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <History size={22} className="text-blue-600" />
                                更换记录管理
                            </h1>
                            <p className="text-sm text-slate-600 mt-1">
                                {printer.brand} {printer.model} - {printer.location}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                        <Plus size={18} />
                        添加记录
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-5xl mx-auto p-8">
                {history.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-slate-300">
                        <p className="text-slate-600 font-medium">暂无更换记录</p>
                        <p className="text-sm text-slate-500 mt-2">点击"添加记录"按钮创建新记录</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">墨盒颜色</th>
                                    <th className="px-6 py-4">墨粉量</th>
                                    <th className="px-6 py-4">来源</th>
                                    <th className="px-6 py-4">记录时间</th>
                                    <th className="px-6 py-4 text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {history.map((record) => (
                                    <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900">{record.color}</td>
                                        <td className="px-6 py-4 text-slate-700">
                                            {record.max_capacity > 0 ? Math.round((record.level / record.max_capacity) * 100) : '?'}%
                                        </td>
                                        <td className="px-6 py-4">
                                            {record.source === 'auto' ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-md text-xs font-medium">
                                                    <Cpu size={12} />
                                                    系统扫描
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">
                                                    <User size={12} />
                                                    手动添加
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            <div>{formatDate(record.recorded_at)}</div>
                                            <div className="text-xs text-slate-500">{formatTime(record.recorded_at)}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDelete(record.id)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                title="删除"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">添加更换记录</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    墨盒颜色 *
                                </label>
                                <input
                                    type="text"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    placeholder="例如: Black Toner, Cyan Cartridge"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        当前墨粉量
                                    </label>
                                    <input
                                        type="number"
                                        value={level}
                                        onChange={(e) => setLevel(e.target.value)}
                                        min="0"
                                        max="100"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        最大容量
                                    </label>
                                    <input
                                        type="number"
                                        value={maxCapacity}
                                        onChange={(e) => setMaxCapacity(e.target.value)}
                                        min="1"
                                        max="100"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleAdd}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                                添加
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
