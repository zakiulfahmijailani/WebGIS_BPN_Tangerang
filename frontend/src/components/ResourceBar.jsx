import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#EC4899'];

export default function ResourceBar({ features }) {
    const data = useMemo(() => {
        const typeArea = {};
        features.forEach(f => {
            const type = f.properties?.type || 'Unknown';
            const area = parseFloat(f.properties?.area) || 0;
            typeArea[type] = (typeArea[type] || 0) + area;
        });
        return Object.entries(typeArea)
            .map(([name, area]) => ({ name, area: Math.round(area) }))
            .sort((a, b) => b.area - a.area);
    }, [features]);

    return (
        <div className="rounded-xl border border-transparent shadow-sm p-2 w-full">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                📊 Total Area by Type
            </h3>
            <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                        <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                            formatter={(val) => [`${val.toLocaleString()} m²`, 'Area']} />
                        <Bar dataKey="area" radius={[6, 6, 0, 0]}>
                            {data.map((_, i) => (
                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
