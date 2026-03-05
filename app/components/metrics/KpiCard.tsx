'use client';

import React from 'react';

interface KpiCardProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    subtitle: string;
    accentColor: string;
}

const KpiCard = React.memo(function KpiCard({
    icon,
    label,
    value,
    subtitle,
    accentColor,
}: KpiCardProps) {
    return (
        <div
            className="glass p-3 group hover:border-slate-300 transition-all cursor-default"
            style={{ borderLeft: `3px solid ${accentColor}` }}
        >
            <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white mb-2 shadow-md group-hover:scale-105 transition-transform"
                style={{ background: accentColor }}
            >
                {icon}
            </div>
            <p className="text-lg font-bold text-slate-800 tracking-tight leading-tight">{value}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mt-0.5">{label}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>
        </div>
    );
});

export default KpiCard;
