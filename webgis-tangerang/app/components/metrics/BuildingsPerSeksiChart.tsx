'use client';

import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from 'recharts';
import type { SeksiCount } from './metricsUtils';

interface Props {
    data: SeksiCount[];
}

const BuildingsPerSeksiChart = React.memo(function BuildingsPerSeksiChart({ data }: Props) {
    if (!data || data.length === 0) {
        return <p className="text-xs text-slate-400 text-center py-8">Tidak ada data</p>;
    }

    return (
        <div className="glass p-3">
            <h3 className="text-xs font-semibold text-slate-700 mb-3">Sebaran Bangunan per Seksi</h3>
            <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
                    <CartesianGrid stroke="#cbd5e1" strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                        dataKey="kode_seksi"
                        tick={{ fontSize: 9, fill: '#64748b' }}
                        axisLine={{ stroke: '#cbd5e1' }}
                        tickLine={false}
                        label={{ value: 'Kode Seksi', position: 'insideBottom', offset: -2, fontSize: 10, fill: '#94a3b8' }}
                    />
                    <YAxis
                        tick={{ fontSize: 9, fill: '#64748b' }}
                        axisLine={{ stroke: '#cbd5e1' }}
                        tickLine={false}
                        label={{ value: 'Jumlah', angle: -90, position: 'insideLeft', offset: 16, fontSize: 10, fill: '#94a3b8' }}
                    />
                    <Tooltip
                        contentStyle={{
                            background: 'rgba(255,255,255,0.95)',
                            border: '1px solid #e2e8f0',
                            borderRadius: '10px',
                            fontSize: '11px',
                            color: '#334155',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        }}
                        formatter={(value: number | string | undefined) => [`${value ?? 0} bangunan`, 'Jumlah']}
                        labelFormatter={(label) => `Seksi ${label}`}
                    />
                    <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
});

export default BuildingsPerSeksiChart;
