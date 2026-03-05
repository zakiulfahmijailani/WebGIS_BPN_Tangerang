'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from 'recharts';
import type { HistogramBin } from './metricsUtils';

interface Props {
    data: HistogramBin[];
}

const NopDistributionChart = React.memo(function NopDistributionChart({ data }: Props) {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <div ref={ref} className="glass p-3">
            <h3 className="text-xs font-semibold text-slate-700 mb-3">Distribusi Nilai NOP Simulasi</h3>
            {!isVisible ? (
                <div className="h-[180px] flex items-center justify-center">
                    <p className="text-xs text-slate-400">Scroll untuk memuat chart...</p>
                </div>
            ) : !data || data.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">Tidak ada data</p>
            ) : (
                <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={data} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
                        <CartesianGrid stroke="#cbd5e1" strokeDasharray="3 3" opacity={0.3} />
                        <XAxis
                            dataKey="label"
                            tick={{ fontSize: 7, fill: '#64748b' }}
                            axisLine={{ stroke: '#cbd5e1' }}
                            tickLine={false}
                            interval={0}
                            angle={-35}
                            textAnchor="end"
                            height={45}
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
                            labelFormatter={(label) => `Rentang ${label}`}
                        />
                        <Bar dataKey="count" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            )}
        </div>
    );
});

export default NopDistributionChart;
