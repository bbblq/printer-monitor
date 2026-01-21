'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Cpu, User, History, Save } from 'lucide-react';

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
    remark?: string;
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
    const [newColor, setNewColor] = useState('Black');
    const [newRemark, setNewRemark] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [timezone, setTimezone] = useState('browser');

    useEffect(() => {
        fetchData();
    }, [printerId]);

    const fetchData = async () => {
        try {
            // Fetch settings
            fetch('/api/admin/settings').then(res => res.json()).then(data => {
                if (data.timezone) setTimezone(data.timezone);
            }).catch(console.error);

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
        setSubmitting(true);
        try {
            await fetch('/api/history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'add_history',
                    printerId: printerId,
                    color: newColor,
                    remark: newRemark,
                    level: 100,
                    maxCapacity: 100,
                    source: 'manual'
                })
            });
            setShowAddModal(false);
            setNewRemark('');
            fetchData();
        } catch (e) {
            console.error(e);
            alert('添加失败');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (historyId: number) => {
        if (!confirm('确认删除该记录吗？')) return;

        await fetch(`/api/history?id=${historyId}`, { method: 'DELETE' });
        fetchData();
    };

    const formatDate = (dateStr: string) => {
        const utcDate = new Date(dateStr + ' UTC');

        if (timezone === 'UTC') {
            return utcDate.toISOString().replace('T', ' ').substring(0, 16) + ' UTC';
        }

        if (timezone === 'Asia/Shanghai') {
            // Manual adjustment for Beijing time if not supported by simple conversion
            // Or use intl
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

        // Default to browser local
        const year = utcDate.getFullYear();
        const month = String(utcDate.getMonth() + 1).padStart(2, '0');
        const day = String(utcDate.getDate()).padStart(2, '0');
        const hours = String(utcDate.getHours()).padStart(2, '0');
        const minutes = String(utcDate.getMinutes()).padStart(2, '0');
        return `${year}/${month}/${day} ${hours}:${minutes}`;
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
            <div className="bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-10 w-full">
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
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm active:scale-95"
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
                        <p className="text-sm text-slate-500 mt-2">当墨粉更换或系统检测到状态恢复时会自动增加</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">颜色</th>
                                    <th className="px-6 py-4">来源</th>
                                    <th className="px-6 py-4">备注</th>
                                    <th className="px-6 py-4">记录时间</th>
                                    <th className="px-6 py-4 text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {history.map((record) => (
                                    <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-2">
                                            <span
                                                className="w-3 h-3 rounded-full border border-slate-200"
                                                style={{ backgroundColor: getColorHex(record.color) }}
                                            />
                                            {getColorName(record.color)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {record.source === 'auto' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 rounded-md text-xs font-bold border border-green-100">
                                                    <Cpu size={14} />
                                                    系统扫描
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-bold border border-blue-100">
                                                    <User size={14} />
                                                    手动添加
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {record.remark ? (
                                                <span className="text-slate-700 bg-slate-100 px-2 py-1 rounded text-xs border border-slate-200">
                                                    {record.remark}
                                                </span>
                                            ) : <span className="text-slate-300">-</span>}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                                            {formatDate(record.recorded_at)}
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
                        <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800">手动添加更换记录</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                                <ArrowLeft size={20} className="rotate-180" /> {/* Using rotate as close icon rough substitute if X not imported, wait I didn't import X. Let's use Cancel button below mostly */}
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="mb-4">
                                <label className="block text-slate-700 text-sm font-bold mb-2">更换颜色</label>
                                <select
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                    value={newColor}
                                    onChange={e => setNewColor(e.target.value)}
                                >
                                    <option value="Black">黑色 (Black)</option>
                                    <option value="Cyan">青色 (Cyan)</option>
                                    <option value="Magenta">品红 (Magenta)</option>
                                    <option value="Yellow">黄色 (Yellow)</option>
                                    <option value="Waste Toner">废粉盒 (Waste)</option>
                                    <option value="Other">其他 (Other)</option>
                                </select>
                            </div>

                            <div className="mb-6">
                                <label className="block text-slate-700 text-sm font-bold mb-2">备注 (选填)</label>
                                <input
                                    type="text"
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="例如：原装墨粉，或报修单号"
                                    value={newRemark}
                                    onChange={e => setNewRemark(e.target.value)}
                                />
                            </div>

                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleAdd}
                                    disabled={submitting}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold text-sm flex items-center gap-2 disabled:opacity-50"
                                >
                                    <Save size={16} />
                                    {submitting ? '提交中...' : '确认添加'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function getColorHex(name: string) {
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
