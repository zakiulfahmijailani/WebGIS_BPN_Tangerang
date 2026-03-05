'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { DataQuality } from './metricsUtils';
import { formatIDR } from './metricsUtils';

interface Props {
    data: DataQuality;
}

const DataQualityPanel = React.memo(function DataQualityPanel({ data }: Props) {
    const [isOpen, setIsOpen] = useState(false);

    const rows = [
        { label: 'Total fitur', value: data.totalFeatures.toLocaleString('id-ID') },
        { label: 'Unik kode_desa', value: data.uniqueDesa.toLocaleString('id-ID') },
        { label: 'Unik kode_seksi', value: data.uniqueSeksi.toLocaleString('id-ID') },
        { label: 'Data update tertua', value: data.oldestYear > 0 ? String(data.oldestYear) : '–' },
        { label: 'Data update terbaru', value: data.newestYear > 0 ? String(data.newestYear) : '–' },
        { label: '% data ≥2015', value: `${data.recentPct.toFixed(1)}%` },
        { label: 'NOP minimum', value: formatIDR(data.nopMin) },
        { label: 'NOP maksimum', value: formatIDR(data.nopMax) },
        { label: 'NOP median', value: formatIDR(data.nopMedian) },
    ];

    return (
        <div className="glass overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/40 transition-colors"
            >
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    📋 Data Quality Summary
                </span>
                {isOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                )}
            </button>

            {isOpen && (
                <div className="border-t border-white/20">
                    {rows.map((row, i) => (
                        <div
                            key={row.label}
                            className={`flex items-center justify-between px-3 py-1.5 ${i % 2 === 0 ? 'bg-white/20' : 'bg-transparent'
                                }`}
                        >
                            <span className="text-[10px] text-slate-500">{row.label}</span>
                            <span className="text-[10px] text-slate-800 font-medium">{row.value}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});

export default DataQualityPanel;
