import React, { useMemo } from 'react';

function ProgressRing({ value, max = 100, size = 48, stroke = 4, color = '#3B82F6' }) {
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const pct = Math.min(value / max, 1);
    const offset = circumference * (1 - pct);

    return (
        <svg width={size} height={size} className="progress-ring">
            <circle cx={size / 2} cy={size / 2} r={radius}
                fill="none" stroke="#F1F5F9" strokeWidth={stroke} />
            <circle cx={size / 2} cy={size / 2} r={radius}
                fill="none" stroke={color} strokeWidth={stroke}
                strokeDasharray={circumference} strokeDashoffset={offset}
                strokeLinecap="round" className="progress-ring-circle" />
        </svg>
    );
}

export default function KPICards({ features, filteredFeatures }) {
    const totalBuildings = filteredFeatures.length;
    const allTotal = features.length;

    const { totalArea, avgArea, typeCount, dataCoverage } = useMemo(() => {
        let area = 0, withArea = 0, withType = 0;
        const types = new Set();
        filteredFeatures.forEach(f => {
            const a = parseFloat(f.properties?.area);
            if (a > 0) { area += a; withArea++; }
            if (f.properties?.type) { types.add(f.properties.type); withType++; }
        });
        const total = filteredFeatures.length || 1;
        const coverage = Math.round(((withArea + withType) / (total * 2)) * 100);
        return {
            totalArea: area,
            avgArea: filteredFeatures.length > 0 ? area / filteredFeatures.length : 0,
            typeCount: types.size,
            dataCoverage: coverage,
        };
    }, [filteredFeatures]);

    const formatArea = (val) => {
        if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}km²`;
        if (val >= 1_000) return `${(val / 1_000).toFixed(1)}k`;
        return Math.round(val).toString();
    };

    const cards = [
        {
            label: 'Total Buildings',
            value: totalBuildings.toLocaleString(),
            sub: `of ${allTotal.toLocaleString()} total`,
            color: '#3B82F6',
            bgColor: 'bg-blue-50',
            textColor: 'text-blue-600',
            icon: '🏢',
        },
        {
            label: 'Data Coverage',
            value: `${dataCoverage}%`,
            sub: 'Field completeness',
            color: '#10B981',
            bgColor: 'bg-emerald-50',
            textColor: 'text-emerald-600',
            icon: 'ring',
            ringValue: dataCoverage,
        },
        {
            label: 'Avg Building Area',
            value: `${formatArea(avgArea)} m²`,
            sub: `Total: ${formatArea(totalArea)} m²`,
            color: '#F59E0B',
            bgColor: 'bg-amber-50',
            textColor: 'text-amber-600',
            icon: '📐',
        },
        {
            label: 'Building Types',
            value: typeCount.toString(),
            sub: 'Distinct categories',
            color: '#8B5CF6',
            bgColor: 'bg-violet-50',
            textColor: 'text-violet-600',
            icon: '🏷️',
        },
    ];

    return (
        <div className="flex flex-col gap-3">
            {cards.map((c, i) => (
                <div key={i} className="bg-white/40 rounded-xl border border-white/50 p-4 shadow-sm hover:bg-white/60 transition-all group">
                    <div className="flex items-start justify-between mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {c.label}
                        </span>
                        {c.icon === 'ring' ? (
                            <ProgressRing value={c.ringValue} color={c.color} size={36} stroke={3} />
                        ) : (
                            <span className={`w-8 h-8 rounded-lg ${c.bgColor} flex items-center justify-center text-sm`}>
                                {c.icon}
                            </span>
                        )}
                    </div>
                    <div className={`text-2xl font-extrabold tracking-tight ${c.textColor} mb-0.5`}>
                        {c.value}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium">{c.sub}</div>
                </div>
            ))}
        </div>
    );
}
