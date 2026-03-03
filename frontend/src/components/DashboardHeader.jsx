import React, { useState, useEffect } from 'react';

export default function DashboardHeader({ features, filterType, onFilterType, filterArea, onFilterArea }) {
    const [clock, setClock] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setClock(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Extract unique types from features
    const types = [...new Set(features.map(f => f.properties?.type).filter(Boolean))].sort();

    return (
        <header className="px-5 py-3 flex items-center gap-4 flex-shrink-0 bg-transparent">
            {/* Logo & Title */}
            <div className="flex items-center gap-3 mr-4">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-lg font-bold shadow-sm">
                    W
                </div>
                <div>
                    <h1 className="text-base font-extrabold text-slate-900 leading-tight tracking-tight">WebGIS Tangerang</h1>
                    <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">Operational Intelligence</p>
                </div>
            </div>

            {/* Divider */}
            <div className="w-px h-8 bg-slate-200" />

            {/* Global Filters */}
            <div className="flex items-center gap-3 flex-1">
                <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-500">Type</label>
                    <select
                        className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                        value={filterType}
                        onChange={(e) => onFilterType(e.target.value)}
                    >
                        <option value="all">All Types</option>
                        {types.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-500">Area</label>
                    <select
                        className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                        value={filterArea}
                        onChange={(e) => onFilterArea(e.target.value)}
                    >
                        <option value="all">All Sizes</option>
                        <option value="small">Small (&lt;500 m²)</option>
                        <option value="medium">Medium (500–2000 m²)</option>
                        <option value="large">Large (&gt;2000 m²)</option>
                    </select>
                </div>
            </div>

            {/* Clock */}
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-1.5 border border-slate-100">
                <span>🕐</span>
                <span className="font-mono font-semibold tabular-nums text-slate-700">
                    {clock.toLocaleTimeString('en-GB', { hour12: false })}
                </span>
                <span className="text-slate-400">
                    {clock.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
            </div>
        </header>
    );
}
