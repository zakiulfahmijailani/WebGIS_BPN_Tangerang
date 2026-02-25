import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'];

export default function AreaPieChart({ features }) {
    const data = useMemo(() => {
        const areaMap = {};
        features.forEach(f => {
            const type = f.properties?.type || 'Unknown';
            const area = parseFloat(f.properties?.area) || 0;
            areaMap[type] = (areaMap[type] || 0) + area;
        });
        return Object.entries(areaMap)
            .map(([name, value]) => ({ name, value: Math.round(value) }))
            .sort((a, b) => b.value - a.value);
    }, [features]);

    const total = data.reduce((s, d) => s + d.value, 0);

    const renderLabel = ({ name, percent }) => {
        if (percent < 0.05) return null;
        return `${(percent * 100).toFixed(0)}%`;
    };

    return (
        <div className="card">
            <div className="card-title">🥧 Area Distribution by Type</div>
            <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            outerRadius={75}
                            innerRadius={40}
                            dataKey="value"
                            label={renderLabel}
                            labelLine={false}
                            strokeWidth={1}
                            stroke="#0f172a"
                        >
                            {data.map((_, i) => (
                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                background: '#1e293b', border: '1px solid #334155',
                                borderRadius: 8, fontSize: 12,
                            }}
                            formatter={(value) => [`${value.toLocaleString()} m²`, 'Area']}
                        />
                        <Legend
                            iconType="circle"
                            iconSize={8}
                            wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
