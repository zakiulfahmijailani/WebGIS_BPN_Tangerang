'use client';

import React from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    ReferenceLine,
} from 'recharts';
import type { YearCount } from './metricsUtils';

interface Props {
    data: YearCount[];
}

const UpdateTrendChart = React.memo(function UpdateTrendChart({ data }: Props) {
    if (!data || data.length === 0) {
        return <p className="text-xs text-slate-400 text-center py-8">Tidak ada data</p>;
    }

    return (
        <div className="glass p-3">
            <h3 className="text-xs font-semibold text-slate-700 mb-3">Tren Pembaruan Data</h3>
            <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 4 }}>
                    <defs>
                        <linearGradient id="colorUpdate" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.02} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#cbd5e1" strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                        dataKey="year"
                        tick={{ fontSize: 9, fill: '#64748b' }}
                        axisLine={{ stroke: '#cbd5e1' }}
                        tickLine={false}
                        label={{ value: 'Tahun', position: 'insideBottom', offset: -2, fontSize: 10, fill: '#94a3b8' }}
                    />
                    <YAxis
                        tick={{ fontSize: 9, fill: '#64748b' }}
                        axisLine={{ stroke: '#cbd5e1' }}
                        tickLine={false}
                        label={{ value: 'Diperbarui', angle: -90, position: 'insideLeft', offset: 16, fontSize: 10, fill: '#94a3b8' }}
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
                        formatter={(value: number | string | undefined) => [`${value ?? 0} bangunan diperbarui`, '']}
                        labelFormatter={(label) => `Tahun ${label}`}
                    />
                    <ReferenceLine
                        x={2015}
                        stroke="#F43F5E"
                        strokeDasharray="4 4"
                        label={{ value: 'Threshold', position: 'top', fontSize: 9, fill: '#F43F5E' }}
                    />
                    <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#8B5CF6"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorUpdate)"
                        dot={{ r: 3, fill: '#8B5CF6', stroke: '#fff', strokeWidth: 1 }}
                        activeDot={{ r: 5, fill: '#8B5CF6' }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
});

export default UpdateTrendChart;
