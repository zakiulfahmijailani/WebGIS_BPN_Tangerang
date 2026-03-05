'use client';

import { useMemo } from 'react';
import {
    Building2,
    Banknote,
    TrendingUp,
    MapPin,
    RefreshCw,
    Clock,
} from 'lucide-react';
import KpiCard from './KpiCard';
import BuildingsPerSeksiChart from './BuildingsPerSeksiChart';
import TopDesaChart from './TopDesaChart';
import UpdateTrendChart from './UpdateTrendChart';
import NopDistributionChart from './NopDistributionChart';
import DataQualityPanel from './DataQualityPanel';
import {
    computeKPIs,
    groupBySeksi,
    topDesaByCount,
    trendByYear,
    nopHistogram,
    computeDataQuality,
    formatIDR,
} from './metricsUtils';

interface MetricsPanelProps {
    geojsonData: GeoJSON.FeatureCollection | null;
    buildingsData: GeoJSON.FeatureCollection | null;
    activeQuery: string;
}

export default function MetricsPanel({
    geojsonData,
    buildingsData,
    activeQuery,
}: MetricsPanelProps) {
    // Use AI result if available, otherwise fallback to buildings
    const data = geojsonData || buildingsData;
    const features = data?.features ?? [];

    // ─── All computations memoized on features ───
    const kpis = useMemo(() => computeKPIs(features), [features]);
    const seksiData = useMemo(() => groupBySeksi(features), [features]);
    const desaData = useMemo(() => topDesaByCount(features, 10), [features]);
    const trendData = useMemo(() => trendByYear(features), [features]);
    const histData = useMemo(() => nopHistogram(features, 10), [features]);
    const qualityData = useMemo(() => computeDataQuality(features), [features]);

    return (
        <div className="flex flex-col h-full bg-transparent overflow-y-auto scrollbar-thin">
            {/* Header */}
            <div className="flex-none px-4 py-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                        <TrendingUp className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-slate-800">Analytics</h2>
                        <p className="text-[10px] text-slate-500">
                            Berdasarkan {features.length.toLocaleString('id-ID')} bangunan
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex-1 px-3 py-3 space-y-3">
                {/* Row 1 KPI */}
                <div className="grid grid-cols-2 gap-2">
                    <KpiCard
                        icon={<Building2 className="w-4 h-4" />}
                        label="Total Bangunan"
                        value={kpis.totalBuildings.toLocaleString('id-ID')}
                        subtitle="seluruh Kota Tangerang"
                        accentColor="#3B82F6"
                    />
                    <KpiCard
                        icon={<Banknote className="w-4 h-4" />}
                        label="Total NOP Simulasi"
                        value={formatIDR(kpis.totalNop)}
                        subtitle="estimasi nilai objek pajak"
                        accentColor="#10B981"
                    />
                </div>

                {/* Row 2 KPI */}
                <div className="grid grid-cols-2 gap-2">
                    <KpiCard
                        icon={<TrendingUp className="w-4 h-4" />}
                        label="Rata-rata NOP"
                        value={formatIDR(kpis.avgNop)}
                        subtitle="nilai objek rata-rata"
                        accentColor="#8B5CF6"
                    />
                    <KpiCard
                        icon={<MapPin className="w-4 h-4" />}
                        label="Kelurahan Terdata"
                        value={kpis.uniqueDesaCount.toLocaleString('id-ID')}
                        subtitle={`dari ${kpis.uniqueSeksiCount} seksi`}
                        accentColor="#F59E0B"
                    />
                </div>

                {/* Row 3 KPI */}
                <div className="grid grid-cols-2 gap-2">
                    <KpiCard
                        icon={<RefreshCw className="w-4 h-4" />}
                        label="Data Terbaru (≥2015)"
                        value={`${kpis.recentDataPct.toFixed(1)}%`}
                        subtitle="bangunan dengan data diperbarui"
                        accentColor="#14B8A6"
                    />
                    <KpiCard
                        icon={<Clock className="w-4 h-4" />}
                        label="Umur Data Rata-rata"
                        value={`${kpis.avgDataAge.toFixed(1)} tahun`}
                        subtitle="rata-rata umur data terdaftar"
                        accentColor="#F43F5E"
                    />
                </div>

                <hr className="border-slate-200/60 my-1" />

                {/* Chart E: Buildings per Seksi */}
                <BuildingsPerSeksiChart data={seksiData} />

                <hr className="border-slate-200/60 my-1" />

                {/* Chart F: Top 10 Desa */}
                <TopDesaChart data={desaData} />

                <hr className="border-slate-200/60 my-1" />

                {/* Chart G: Update Trend */}
                <UpdateTrendChart data={trendData} />

                <hr className="border-slate-200/60 my-1" />

                {/* Chart H: NOP Distribution */}
                <NopDistributionChart data={histData} />

                <hr className="border-slate-200/60 my-1" />

                {/* Data Quality Summary */}
                <DataQualityPanel data={qualityData} />

                {/* Bottom spacer */}
                <div className="h-4" />
            </div>
        </div>
    );
}
