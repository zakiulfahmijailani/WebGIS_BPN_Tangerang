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
import type { DesaCount } from './metricsUtils';

interface Props {
    data: DesaCount[];
}

const TopDesaChart = React.memo(function TopDesaChart({ data }: Props) {
    if (!data || data.length === 0) {
        return <p className="text-xs text-slate-400 text-center py-8">Tidak ada data</p>;
    }

    return (
        <div className="glass p-3">
            <h3 className="text-xs font-semibold text-slate-700 mb-3">Top 10 Kelurahan Terpadat</h3>
            <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 4 }}>
                    <CartesianGrid stroke="#cbd5e1" strokeDasharray="3 3" opacity={0.3} horizontal={false} />
                    <XAxis
                        type="number"
                        tick={{ fontSize: 9, fill: '#64748b' }}
                        axisLine={{ stroke: '#cbd5e1' }}
                        tickLine={false}
                        label={{ value: 'Jumlah Bangunan', position: 'insideBottom', offset: -2, fontSize: 10, fill: '#94a3b8' }}
                    />
                    <YAxis
                        type="category"
                        dataKey="kode_desa"
                        tick={{ fontSize: 9, fill: '#64748b' }}
                        axisLine={{ stroke: '#cbd5e1' }}
                        tickLine={false}
                        width={50}
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
                        labelFormatter={(label) => `Desa ${label}`}
                    />
                    <Bar dataKey="count" fill="#10B981" radius={[0, 4, 4, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
});

export default TopDesaChart;
