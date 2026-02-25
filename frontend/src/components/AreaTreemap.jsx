import React, { useMemo } from 'react';
import { Treemap, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#db2777'];

function CustomContent({ x, y, width, height, name, value, index }) {
    if (width < 30 || height < 20) return null;
    return (
        <g>
            <rect x={x} y={y} width={width} height={height} rx={4}
                fill={COLORS[index % COLORS.length]} fillOpacity={0.85}
                stroke="#fff" strokeWidth={2}
            />
            {width > 50 && height > 30 && (
                <>
                    <text x={x + 8} y={y + 16} fill="#fff" fontSize={11} fontWeight={600}>
                        {name}
                    </text>
                    <text x={x + 8} y={y + 30} fill="rgba(255,255,255,0.7)" fontSize={10}>
                        {value?.toLocaleString()} m²
                    </text>
                </>
            )}
        </g>
    );
}

export default function AreaTreemap({ features }) {
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

    return (
        <div className="card">
            <div className="card-title">🌳 Area Treemap</div>
            <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                    <Treemap
                        data={data}
                        dataKey="value"
                        nameKey="name"
                        content={<CustomContent />}
                    >
                        <Tooltip
                            contentStyle={{
                                background: '#fff', border: '1px solid #e2e8f0',
                                borderRadius: 8, fontSize: 12,
                            }}
                            formatter={(val) => [`${val.toLocaleString()} m²`, 'Area']}
                        />
                    </Treemap>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
