'use client';

import { useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
} from 'recharts';
import { Building2, Ruler, Search, TrendingUp } from 'lucide-react';

interface AnalyticsPanelProps {
    geojsonData: GeoJSON.FeatureCollection | null;
    buildingsData: GeoJSON.FeatureCollection | null;
    activeQuery: string;
}

const TYPE_COLORS: Record<string, string> = {
    Residential: '#4ade80',
    Commercial: '#facc15',
    Public: '#60a5fa',
    Industrial: '#f97316',
    Empty: '#a1a1aa',
    Other: '#94a3b8',
};

export default function AnalyticsPanel({
    geojsonData,
    buildingsData,
    activeQuery,
}: AnalyticsPanelProps) {
    // Use AI result if available, otherwise fallback to buildings
    const data = geojsonData || buildingsData;

    const stats = useMemo(() => {
        if (!data || !data.features) {
            return {
                totalBuildings: 0,
                totalArea: 0,
                typeCounts: [] as { name: string; count: number }[],
                areaByType: [] as { name: string; value: number }[],
            };
        }

        const typeCounts: Record<string, number> = {};
        const areaByType: Record<string, number> = {};
        let totalArea = 0;

        data.features.forEach((f) => {
            const type = (f.properties?.type as string) || 'Other';
            const area = parseFloat(f.properties?.area as string) || 0;

            typeCounts[type] = (typeCounts[type] || 0) + 1;
            areaByType[type] = (areaByType[type] || 0) + area;
            totalArea += area;
        });

        return {
            totalBuildings: data.features.length,
            totalArea,
            typeCounts: Object.entries(typeCounts)
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count),
            areaByType: Object.entries(areaByType)
                .map(([name, value]) => ({ name, value: Math.round(value) }))
                .sort((a, b) => b.value - a.value),
        };
    }, [data]);

    const formatArea = (area: number) => {
        if (area >= 1_000_000) return `${(area / 1_000_000).toFixed(1)}M m²`;
        if (area >= 1_000) return `${(area / 1_000).toFixed(1)}K m²`;
        return `${Math.round(area)} m²`;
    };

    return (
        <div className="flex flex-col h-full bg-slate-900/50 backdrop-blur-sm overflow-y-auto 
                    scrollbar-thin scrollbar-thumb-slate-700">
            {/* Header */}
            <div className="flex-none px-4 py-3 border-b border-slate-700/50">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 
                          flex items-center justify-center shadow-lg shadow-violet-500/20">
                        <TrendingUp className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-white">Analytics</h2>
                        <p className="text-[10px] text-slate-400">Real-time spatial metrics</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 px-3 py-3 space-y-4">
                {/* KPI Cards */}
                <div className="grid grid-cols-2 gap-2">
                    <KPICard
                        icon={<Building2 className="w-4 h-4" />}
                        label="Total Buildings"
                        value={stats.totalBuildings.toLocaleString()}
                        gradient="from-cyan-500 to-blue-600"
                    />
                    <KPICard
                        icon={<Ruler className="w-4 h-4" />}
                        label="Total Area"
                        value={formatArea(stats.totalArea)}
                        gradient="from-emerald-500 to-green-600"
                    />
                </div>

                {/* Active Query */}
                {activeQuery && (
                    <div className="bg-slate-800/60 rounded-xl border border-slate-700/40 p-3">
                        <div className="flex items-center gap-2 mb-1">
                            <Search className="w-3 h-3 text-cyan-400" />
                            <span className="text-[10px] text-cyan-400 font-medium uppercase tracking-wider">
                                Active Query
                            </span>
                        </div>
                        <p className="text-xs text-slate-300 truncate">{activeQuery}</p>
                    </div>
                )}

                {/* Bar Chart: Building Count by Type */}
                <div className="bg-slate-800/40 rounded-xl border border-slate-700/30 p-3">
                    <h3 className="text-xs font-medium text-slate-300 mb-3">Building Count by Type</h3>
                    {stats.typeCounts.length > 0 ? (
                        <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={stats.typeCounts} layout="vertical">
                                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} width={80} />
                                <Tooltip
                                    contentStyle={{
                                        background: '#1e293b',
                                        border: '1px solid #334155',
                                        borderRadius: '8px',
                                        fontSize: '11px',
                                        color: '#e2e8f0',
                                    }}
                                />
                                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                    {stats.typeCounts.map((entry, idx) => (
                                        <Cell key={idx} fill={TYPE_COLORS[entry.name] || TYPE_COLORS.Other} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-xs text-slate-500 text-center py-6">No data available</p>
                    )}
                </div>

                {/* Pie Chart: Area Distribution by Type */}
                <div className="bg-slate-800/40 rounded-xl border border-slate-700/30 p-3">
                    <h3 className="text-xs font-medium text-slate-300 mb-3">Area Distribution by Type</h3>
                    {stats.areaByType.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={stats.areaByType}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={70}
                                    paddingAngle={2}
                                    dataKey="value"
                                    nameKey="name"
                                >
                                    {stats.areaByType.map((entry, idx) => (
                                        <Cell key={idx} fill={TYPE_COLORS[entry.name] || TYPE_COLORS.Other} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        background: '#1e293b',
                                        border: '1px solid #334155',
                                        borderRadius: '8px',
                                        fontSize: '11px',
                                        color: '#e2e8f0',
                                    }}
                                    formatter={(value) => formatArea(Number(value ?? 0))}
                                />
                                <Legend
                                    iconSize={8}
                                    wrapperStyle={{ fontSize: '10px', color: '#94a3b8' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-xs text-slate-500 text-center py-6">No data available</p>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── KPI Card Sub-component ───
function KPICard({
    icon,
    label,
    value,
    gradient,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    gradient: string;
}) {
    return (
        <div className="bg-slate-800/60 rounded-xl border border-slate-700/40 p-3 group 
                    hover:border-slate-600/50 transition-all">
            <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${gradient} 
                       flex items-center justify-center text-white mb-2
                       shadow-lg group-hover:scale-105 transition-transform`}>
                {icon}
            </div>
            <p className="text-lg font-bold text-white">{value}</p>
            <p className="text-[10px] text-slate-400">{label}</p>
        </div>
    );
}
