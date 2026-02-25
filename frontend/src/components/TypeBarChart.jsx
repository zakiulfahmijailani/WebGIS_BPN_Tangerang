import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'];

export default function TypeBarChart({ features, onBarClick }) {
    const data = useMemo(() => {
        const countMap = {};
        features.forEach(f => {
            const type = f.properties?.type || 'Unknown';
            countMap[type] = (countMap[type] || 0) + 1;
        });
        return Object.entries(countMap)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }, [features]);

    return (
        <div className="card">
            <div className="card-title">📊 Building Count by Type</div>
            <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                        <Tooltip
                            contentStyle={{
                                background: '#1e293b', border: '1px solid #334155',
                                borderRadius: 8, fontSize: 12
                            }}
                        />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]} cursor="pointer"
                            onClick={(entry) => onBarClick && onBarClick(entry.name)}>
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
