import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function TrendChart({ features }) {
    const data = useMemo(() => {
        const ranges = [
            { label: '0–100', min: 0, max: 100 },
            { label: '100–300', min: 100, max: 300 },
            { label: '300–500', min: 300, max: 500 },
            { label: '500–1k', min: 500, max: 1000 },
            { label: '1k–2k', min: 1000, max: 2000 },
            { label: '2k–5k', min: 2000, max: 5000 },
            { label: '5k+', min: 5000, max: Infinity },
        ];
        return ranges.map(r => {
            const count = features.filter(f => {
                const a = parseFloat(f.properties?.area) || 0;
                return a >= r.min && a < r.max;
            }).length;
            return { name: r.label, buildings: count };
        });
    }, [features]);

    return (
        <div className="rounded-xl border border-transparent shadow-sm p-2 w-full">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                📈 Area Distribution Trend
            </h3>
            <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                            <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }} />
                        <Area type="monotone" dataKey="buildings" stroke="#3B82F6" strokeWidth={2}
                            fill="url(#blueGrad)" dot={{ r: 3, fill: '#3B82F6' }} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
