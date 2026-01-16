'use client';

import React from 'react';
import { Printer } from '@/lib/types';
import { SupplyBar } from './SupplyBar';
import { AlertCircle, History } from 'lucide-react';

interface PrinterCardProps {
    printer: Printer;
    onViewHistory: (printer: Printer) => void;
}

export function PrinterCard({ printer, onViewHistory }: PrinterCardProps) {
    const isOnline = printer.is_online === 1;

    // Filter out waste toner as requested (User: "If values incorrect, hide it")
    // User noted 100% waste is wrong, so we hide it.
    const supplies = printer.supplies.filter(s => !s.color.includes('废') && !s.color.toLowerCase().includes('waste'));

    const sortedSupplies = supplies.sort((a, b) => {
        const getScore = (s: typeof a) => {
            const name = s.color.toLowerCase();
            if (name.includes('cyan') || name.includes('青') || name.includes('c') && !name.includes('black')) return 1;
            if (name.includes('magenta') || name.includes('品') || name.includes('m')) return 2;
            if (name.includes('yellow') || name.includes('黄') || name.includes('y')) return 3;
            if (name.includes('black') || name.includes('黑') || name.includes('k')) return 4;
            return 10;
        };
        return getScore(a) - getScore(b);
    });

    return (
        <div className={`
        relative rounded-xl border p-5 transition-all shadow-sm
        ${isOnline
                ? 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'
                : 'bg-red-50 border-red-200'
            }
    `}>
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="font-black text-xl text-slate-800 leading-tight mb-1.5">{printer.location}</h3>
                    <div className="font-mono text-sm text-slate-500 mb-4 space-y-1.5">
                        <div className="font-bold">{printer.model}</div>
                        <div>{printer.ip}</div>
                        {printer.consumable_model && (
                            <div className="text-slate-400 text-xs tracking-wide border-t border-slate-100 pt-1.5 mt-1.5">
                                耗材型号: <span className="text-slate-500 font-bold">{printer.consumable_model}</span>
                            </div>
                        )}
                    </div>
                </div>
                {/* Status indicator */}
                <div className="flex flex-col items-end gap-2">
                    {!isOnline && (
                        <div className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded border border-red-200 flex items-center gap-1">
                            <AlertCircle size={10} />
                            离线
                        </div>
                    )}

                    <button
                        onClick={() => onViewHistory(printer)}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                        title="查看更换记录"
                    >
                        <History size={16} />
                    </button>
                </div>
            </div>

            {/* Supplies Body */}
            <div className="min-h-[140px] flex items-end">
                {isOnline ? (
                    sortedSupplies.length > 0 ? (
                        <div className="w-full flex justify-between gap-2 px-2">
                            {sortedSupplies.map((supply, i) => (
                                <SupplyBar
                                    key={i}
                                    colorName={supply.color}
                                    level={supply.level}
                                    max={supply.max_capacity}
                                    percent={supply.max_capacity > 0 ? Math.round((supply.level / supply.max_capacity) * 100) : 0}
                                    type={supply.color.toLowerCase().includes('waste') ? 'waste' : 'toner'}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="w-full h-32 flex items-center justify-center text-slate-400 text-sm border border-dashed border-slate-200 rounded bg-slate-50">
                            正在加载数据...
                        </div>
                    )
                ) : (
                    <div className="w-full h-32 flex items-center justify-center text-red-300 text-4xl font-black select-none">
                        离线
                    </div>
                )}
            </div>
        </div>
    );
}
