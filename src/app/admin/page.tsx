'use client';

import { useState, useEffect } from 'react';
import { Trash2, Plus, Monitor, LogOut, Edit, ArrowUp, ArrowDown, History, Download, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { AddPrinterModal } from '@/components/AddPrinterModal';
import { EditPrinterModal } from '@/components/EditPrinterModal'; // Import Edit Modal
import { SystemSettings } from '@/components/SystemSettings'; // Import System Settings
import { Printer } from '@/lib/types';

export default function AdminDashboard() {
    const [printers, setPrinters] = useState<Printer[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingPrinter, setEditingPrinter] = useState<Printer | null>(null); // State for editing
    const router = useRouter();

    const fetchPrinters = async () => {
        try {
            const res = await fetch('/api/printers');
            const data = await res.json();
            setPrinters(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPrinters();
    }, []);

    const handleDelete = async (id: number) => {
        if (!confirm('确认删除该打印机吗？')) return;

        await fetch('/api/admin/printers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', id })
        });
        fetchPrinters();
    };

    const handleMoveUp = async (index: number) => {
        if (index === 0) return; // Already at top
        const newPrinters = [...printers];
        [newPrinters[index - 1], newPrinters[index]] = [newPrinters[index], newPrinters[index - 1]];

        // Update display_order for both
        await fetch('/api/admin/printers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'reorder',
                updates: [
                    { id: newPrinters[index - 1].id, display_order: index - 1 },
                    { id: newPrinters[index].id, display_order: index }
                ]
            })
        });
        fetchPrinters();
    };

    const handleMoveDown = async (index: number) => {
        if (index === printers.length - 1) return; // Already at bottom
        const newPrinters = [...printers];
        [newPrinters[index], newPrinters[index + 1]] = [newPrinters[index + 1], newPrinters[index]];

        // Update display_order for both
        await fetch('/api/admin/printers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'reorder',
                updates: [
                    { id: newPrinters[index].id, display_order: index },
                    { id: newPrinters[index + 1].id, display_order: index + 1 }
                ]
            })
        });
        fetchPrinters();
    };


    const handleLogout = () => {
        Cookies.remove('admin_auth');
        router.push('/admin/login');
    };

    const handleExport = () => {
        window.location.href = '/api/admin/export';
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const json = event.target?.result;
                if (typeof json !== 'string') return;

                const res = await fetch('/api/admin/import', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: json
                });

                if (res.ok) {
                    alert('导入成功');
                    fetchPrinters();
                } else {
                    const data = await res.json();
                    alert('导入失败: ' + data.error);
                }
            } catch (err) {
                console.error(err);
                alert('文件解析失败');
            }
            // Reset input
            e.target.value = '';
        };
        reader.readAsText(file);
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            {/* Navbar */}
            <nav className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xl">
                    <div className="bg-slate-900 text-white p-1.5 rounded-lg">
                        <Monitor size={20} />
                    </div>
                    <span>打印机后台管理</span>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/')} className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">
                        返回看板
                    </button>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                    >
                        <LogOut size={16} />
                        退出
                    </button>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto p-8">

                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-2xl font-bold text-slate-800">设备列表</h1>
                    <div className="flex gap-2">
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-lg font-medium shadow-sm transition-all"
                        >
                            <Download size={18} />
                            导出
                        </button>
                        <label className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-lg font-medium shadow-sm transition-all cursor-pointer">
                            <Upload size={18} />
                            导入
                            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                        </label>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition-all hover:shadow-md active:scale-95"
                        >
                            <Plus size={18} />
                            添加打印机
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-xs">
                            <tr>
                                <th className="px-6 py-4">排序</th>
                                <th className="px-6 py-4">状态</th>
                                <th className="px-6 py-4">位置</th>
                                <th className="px-6 py-4">品牌</th>
                                <th className="px-6 py-4">型号</th>
                                <th className="px-6 py-4">耗材型号</th>
                                <th className="px-6 py-4">IP 地址</th>
                                <th className="px-6 py-4 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={8} className="p-8 text-center text-slate-400">正在加载...</td></tr>
                            ) : printers.map((p, index) => (
                                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => handleMoveUp(index)}
                                                disabled={index === 0}
                                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                                title="上移"
                                            >
                                                <ArrowUp size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleMoveDown(index)}
                                                disabled={index === printers.length - 1}
                                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                                title="下移"
                                            >
                                                <ArrowDown size={14} />
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex h-2.5 w-2.5 rounded-full ${p.is_online ? 'bg-emerald-500' : 'bg-red-500'}`} title={p.is_online ? 'Online' : 'Offline'} />
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-800">{p.location}</td>
                                    <td className="px-6 py-4 text-slate-600">{p.brand}</td>
                                    <td className="px-6 py-4 text-slate-600 font-mono">{p.model}</td>
                                    <td className="px-6 py-4 text-slate-500">{p.consumable_model || '-'}</td>
                                    <td className="px-6 py-4 text-slate-500 font-mono">{p.ip}</td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        <button
                                            onClick={() => router.push(`/admin/printers/${p.id}/history`)}
                                            className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                                            title="更换记录"
                                        >
                                            <History size={18} />
                                        </button>
                                        <button
                                            onClick={() => setEditingPrinter(p)}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                            title="Edit"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(p.id)}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                            title="Delete"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {!loading && printers.length === 0 && (
                                <tr><td colSpan={8} className="p-12 text-center text-slate-500 italic">暂无打印机，请添加。</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="mt-12">
                    <SystemSettings />
                </div>
            </div>

            <AddPrinterModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdd={() => fetchPrinters()}
            />

            <EditPrinterModal
                isOpen={!!editingPrinter}
                printer={editingPrinter}
                onClose={() => setEditingPrinter(null)}
                onUpdated={() => fetchPrinters()}
            />
        </div>
    );
}
