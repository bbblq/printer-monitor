'use client';

import React, { useEffect, useState } from 'react';
import { Printer } from '@/lib/types';
import { PrinterCard } from '@/components/PrinterCard';
import { HistoryModal } from '@/components/HistoryModal';
import { RefreshCw, Monitor } from 'lucide-react';

export default function Dashboard() {
    const [printers, setPrinters] = useState<Printer[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedPrinter, setSelectedPrinter] = useState<Printer | null>(null);
    const [settings, setSettings] = useState({ system_title: 'Printer Monitor', system_logo: '' });

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

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            if (data.system_title) {
                setSettings(data);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await fetch('/api/printers/refresh', { method: 'POST' });
            await fetchPrinters();
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchPrinters();
        fetchSettings();
        // Auto-refresh every 60 seconds
        const interval = setInterval(fetchPrinters, 60000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-[#f1f5f9]">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 shadow-sm">
                <div className="max-w-[1600px] mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        {settings.system_logo ? (
                            <img src={settings.system_logo} alt="Logo" className="w-10 h-10 object-contain" />
                        ) : (
                            <div className="bg-slate-900 text-white p-2 rounded-lg shadow-sm">
                                <Monitor size={22} className="stroke-[2.5px]" />
                            </div>
                        )}
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">{settings.system_title}</h1>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">
                                系统状态 &bull; {printers.length} 台设备
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className={`
                    flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-lg 
                    text-base font-bold text-slate-600 hover:text-slate-900 hover:border-slate-300
                    transition-all shadow-sm active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed
                `}
                    >
                        <RefreshCw size={18} className={`${refreshing ? 'animate-spin' : ''}`} />
                        {refreshing ? '正在刷新...' : '刷新状态'}
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-[1600px] mx-auto p-6 md:p-8">

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-64 bg-white rounded-xl border border-slate-200 p-4 animate-pulse flex flex-col justify-between">
                                <div className="space-y-3">
                                    <div className="h-5 bg-slate-100 rounded w-1/2"></div>
                                    <div className="h-3 bg-slate-100 rounded w-1/3"></div>
                                </div>
                                <div className="flex gap-4 justify-between pt-8">
                                    {[1, 2, 3, 4].map(j => <div key={j} className="h-24 w-8 bg-slate-100 rounded-sm"></div>)}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-y-8 gap-x-6">
                        {printers.map(printer => (
                            <PrinterCard
                                key={printer.id}
                                printer={printer}
                                onViewHistory={setSelectedPrinter}
                            />
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {!loading && printers.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-32 text-slate-400">
                        <Monitor size={48} className="mb-4 opacity-20" />
                        <p>暂无打印机配置。</p>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="max-w-[1600px] mx-auto px-8 pb-8 text-center">
                <a
                    href="https://github.com/bbblq/printer-monitor"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-slate-400 font-medium hover:text-slate-600 transition-colors"
                >
                    &copy; 2026 {settings.system_title} by bbblq
                </a>
            </footer>

            {/* History Modal */}
            {selectedPrinter && (
                <HistoryModal
                    printer={selectedPrinter}
                    onClose={() => setSelectedPrinter(null)}
                    readOnly={true}
                />
            )}
        </div>
    );
}
