import React from 'react';

interface SupplyBarProps {
    colorName: string;
    level: number;
    max: number;
    percent: number;
    type: 'toner' | 'waste' | 'other';
}

export function SupplyBar({ colorName, level, max, percent, type }: SupplyBarProps) {
    let barColor = '#e2e8f0';
    // Determine contrast text color
    let textColor = 'text-white';

    const lowerName = colorName.toLowerCase();
    const isBinaryCartridge = lowerName.includes('cartridge for lbp');

    if (type === 'waste') {
        barColor = '#94a3b8'; // Slate 400
    } else {
        // Priority: Cyan > Magenta > Yellow > Black (Default)
        // This avoids "Cyan Toner" or "青色碳粉" being trapped by generic "Toner/碳" checks

        if (lowerName.includes('cyan') || lowerName.includes('青') || (lowerName.includes(' c') && !lowerName.includes('black') && !lowerName.includes('cartridge'))) {
            barColor = '#06b6d4'; // Cyan 500
            textColor = 'text-slate-900';
        }
        else if (lowerName.includes('magenta') || lowerName.includes('品') || (lowerName.includes(' m') && !lowerName.includes('black'))) {
            barColor = '#d946ef';
            textColor = 'text-slate-900'; // Magenta is bright, dark text might be better or white. Let's stick to dark for contrast on #d946ef
            textColor = 'text-white'; // User preferred white on M previously? actually #d946ef is quite bright. Let's use white for consistency with prev.
        }
        else if (lowerName.includes('yellow') || lowerName.includes('黄') || (lowerName.includes(' y') && !lowerName.includes('black'))) {
            barColor = '#eab308';
            textColor = 'text-slate-900';
        }
        else {
            // Everything else (Black, K, Generic Toner, etc.) -> Black
            barColor = '#1e293b';
            textColor = 'text-white';
        }
    }

    return (
        <div className="flex flex-col items-center group relative w-full px-1">
            {/* Tooltip */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none shadow-xl border border-slate-700">
                <div className="font-semibold">{colorName}</div>
                <div>{percent}% ({level}/{max > 0 ? max : '?'})</div>
            </div>

            {/* Percentage Text ABOVE the bar */}
            <div className={`mb-1.5 text-xs font-bold text-slate-800 text-center w-full min-h-[1rem]`}>
                {getDisplayText(percent, colorName)}
            </div>

            {/* The Bar Container */}
            <div className="w-9 h-28 bg-slate-100/50 rounded-md relative overflow-hidden border border-slate-200 shadow-inner flex items-center justify-center">
                {isBinaryCartridge ? (
                    <div className={`flex flex-col items-center justify-center font-black text-lg leading-tight ${percent > 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                        {(percent > 0 ? '正常' : '耗尽').split('').map((char, i) => (
                            <span key={i}>{char}</span>
                        ))}
                    </div>
                ) : (
                    <>
                        {/* The Liquid */}
                        <div
                            className="absolute bottom-0 left-0 w-full transition-all duration-1000 ease-out flex items-center justify-center"
                            style={{
                                height: `${Math.max(percent, 0)}%`,
                                backgroundColor: barColor,
                            }}
                        >
                            {/* No text inside liquid anymore */}
                        </div>
                    </>
                )}
            </div>

            {/* Short Label underneath */}
            <div className="mt-1.5 text-xs font-bold text-slate-600 text-center w-full truncate">
                {getShortName(lowerName, type)}
            </div>
        </div>
    );
}

function getShortName(name: string, type: string) {
    if (type === 'waste') return '废料';

    // Stricter logic with Chinese labels
    if (name.includes('cyan') || name.includes('青')) return '青色';
    if (name.includes('magenta') || name.includes('品')) return '品红';
    if (name.includes('yellow') || name.includes('黄')) return '黄色';

    // Black / Generic
    if (name.includes('black') || name.includes('黑色') || name.includes('k')) return '黑色';
    // If it's just "toner" or "cartridge" without C/M/Y, assume Black
    if (!name.includes('cyan') && !name.includes('magenta') && !name.includes('yellow')) return '黑色';

    return name.substring(0, 2);
}

function getDisplayText(percent: number, colorName: string) {
    const isBinaryCartridge = colorName.toLowerCase().includes('cartridge for lbp');
    if (isBinaryCartridge) {
        return '\u00A0'; // Text is shown inside the bar block
    }
    return `${percent}%`;
}
