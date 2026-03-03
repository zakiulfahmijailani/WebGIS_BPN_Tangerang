import React from 'react';

export default function FeatureDetail({ feature, avgArea }) {
    if (!feature) return null;

    const area = parseFloat(feature.area) || 0;
    const ratio = avgArea > 0 ? Math.min((area / avgArea) * 100, 200) : 0;
    const ratioLabel = avgArea > 0 ? (area / avgArea).toFixed(1) : '–';
    const barColor = ratio > 100 ? '#10B981' : ratio > 60 ? '#F59E0B' : '#EF4444';

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    🔍 Selected Building
                </h4>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                    ID: {feature.id || '–'}
                </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Type</span>
                    <span className="text-sm font-semibold text-slate-800">{feature.type || 'Unknown'}</span>
                </div>
                <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Area</span>
                    <span className="text-sm font-semibold text-slate-800">{area > 0 ? `${area.toLocaleString()} m²` : 'N/A'}</span>
                </div>
            </div>

            {/* Comparison bar */}
            <div>
                <div className="flex justify-between items-baseline mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">vs. Dataset Avg</span>
                    <span className="text-xs font-bold" style={{ color: barColor }}>{ratioLabel}×</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(ratio, 100)}%`, background: barColor }} />
                </div>
                <div className="flex justify-between mt-0.5">
                    <span className="text-[9px] text-slate-300">0</span>
                    <span className="text-[9px] text-slate-300">Avg ({avgArea > 0 ? Math.round(avgArea).toLocaleString() : '–'} m²)</span>
                </div>
            </div>
        </div>
    );
}
