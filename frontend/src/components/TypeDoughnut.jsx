import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#EC4899'];

export default function TypeDoughnut({ features }) {
    const data = useMemo(() => {
        const countMap = {};
        features.forEach(f => {
            const type = f.properties?.type || 'Unknown';
            countMap[type] = (countMap[type] || 0) + 1;
        });
        return Object.entries(countMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [features]);

    const renderLabel = ({ percent }) => {
        if (percent < 0.05) return null;
        return `${(percent * 100).toFixed(0)}%`;
    };

    return (
        <div className="rounded-xl border border-transparent shadow-sm p-2 w-full">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                🥧 Building Type Composition
            </h3>
            <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={data} cx="50%" cy="50%" outerRadius={65} innerRadius={35}
                            dataKey="value" label={renderLabel} labelLine={false}
                            strokeWidth={2} stroke="#fff">
                            {data.map((_, i) => (
                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                            formatter={(val) => [`${val} buildings`, 'Count']} />
                        <Legend iconType="circle" iconSize={7}
                            wrapperStyle={{ fontSize: 10, color: '#64748b' }} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
