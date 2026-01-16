'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Server, MapPin, Tag, Box, Printer as PrinterIcon } from 'lucide-react';
import { Printer } from '@/lib/types';

interface EditPrinterModalProps {
    isOpen: boolean;
    printer: Printer | null;
    onClose: () => void;
    onUpdated: () => void;
}

export function EditPrinterModal({ isOpen, printer, onClose, onUpdated }: EditPrinterModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        brand: '',
        model: '',
        ip: '',
        location: '',
        consumable_model: ''
    });

    useEffect(() => {
        if (printer) {
            setFormData({
                brand: printer.brand || '',
                model: printer.model || '',
                ip: printer.ip || '',
                location: printer.location || '',
                consumable_model: printer.consumable_model || ''
            });
        }
    }, [printer]);

    if (!isOpen || !printer) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/admin/printers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update',
                    id: printer.id,
                    ...formData
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to update printer');
            }

            onUpdated();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="relative bg-white w-full max-w-md rounded-xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <div className="p-1.5 bg-blue-100 text-blue-600 rounded-md">
                            <PrinterIcon size={18} />
                        </div>
                        编辑打印机
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && (
                        <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                            <X size={14} />
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        {/* Brand & Model */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">品牌</label>
                                <div className="relative">
                                    <Tag className="absolute left-3 top-3.5 text-slate-400" size={16} />
                                    <input
                                        name="brand"
                                        required
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                        value={formData.brand}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">型号</label>
                                <div className="relative">
                                    <Box className="absolute left-3 top-3.5 text-slate-400" size={16} />
                                    <input
                                        name="model"
                                        required
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                        value={formData.model}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* IP Address */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">IP 地址</label>
                            <div className="relative">
                                <Server className="absolute left-3 top-3.5 text-slate-400" size={16} />
                                <input
                                    name="ip"
                                    required
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                    value={formData.ip}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        {/* Location */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">位置</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3.5 text-slate-400" size={16} />
                                <input
                                    name="location"
                                    required
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                    value={formData.location}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        {/* Consumable Model */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">耗材型号</label>
                            <div className="relative">
                                <Box className="absolute left-3 top-3.5 text-slate-400" size={16} />
                                <input
                                    name="consumable_model"
                                    placeholder="e.g. MP C3503"
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                    value={formData.consumable_model}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 flex justify-end gap-3 border-t border-slate-100 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors text-sm font-medium"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm shadow-blue-200 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? '保存中...' : '保存更改'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
