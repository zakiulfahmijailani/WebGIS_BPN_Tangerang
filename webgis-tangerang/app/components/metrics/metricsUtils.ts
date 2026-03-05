// metricsUtils.ts — pure computation functions (no React)

export interface FeatureProperties {
    'addr:city'?: string;
    'addr:country'?: string;
    'addr:province'?: string;
    id?: number;
    type?: string;
    nib?: string;
    kode_seksi?: string;
    kode_desa?: string;
    tanggal_update?: string;
    nop_simulasi?: number;
    [key: string]: unknown;
}

export interface KPIValues {
    totalBuildings: number;
    totalNop: number;
    avgNop: number;
    uniqueDesaCount: number;
    uniqueSeksiCount: number;
    recentDataPct: number; // % features with tanggal_update year >= 2015
    avgDataAge: number;    // average (2026 - year)
}

export interface SeksiCount {
    kode_seksi: string;
    count: number;
}

export interface DesaCount {
    kode_desa: string;
    count: number;
}

export interface YearCount {
    year: number;
    count: number;
}

export interface HistogramBin {
    label: string;
    min: number;
    max: number;
    count: number;
}

export interface DataQuality {
    totalFeatures: number;
    uniqueDesa: number;
    uniqueSeksi: number;
    oldestYear: number;
    newestYear: number;
    recentPct: number;
    nopMin: number;
    nopMax: number;
    nopMedian: number;
}

// ─── IDR Formatting ───────────────────────────────────────

export function formatIDR(value: number): string {
    if (value < 0) return `-${formatIDR(-value)}`;
    if (value >= 1_000_000_000_000) {
        return `Rp ${(value / 1_000_000_000_000).toFixed(1)}T`;
    }
    if (value >= 1_000_000_000) {
        return `Rp ${(value / 1_000_000_000).toFixed(1)}M`;
    }
    if (value >= 1_000_000) {
        return `Rp ${(value / 1_000_000).toFixed(1)}JT`;
    }
    if (value >= 1_000) {
        return `Rp ${(value / 1_000).toFixed(1)}RB`;
    }
    return `Rp ${Math.round(value)}`;
}

function formatIDRShort(value: number): string {
    if (value >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(0)}T`;
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(0)}M`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}JT`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}RB`;
    return `${Math.round(value)}`;
}

// ─── KPI Computations ─────────────────────────────────────

export function computeKPIs(features: GeoJSON.Feature[]): KPIValues {
    if (!features || features.length === 0) {
        return {
            totalBuildings: 0,
            totalNop: 0,
            avgNop: 0,
            uniqueDesaCount: 0,
            uniqueSeksiCount: 0,
            recentDataPct: 0,
            avgDataAge: 0,
        };
    }

    let totalNop = 0;
    const desaSet = new Set<string>();
    const seksiSet = new Set<string>();
    let recentCount = 0;
    let totalAge = 0;
    let validYearCount = 0;

    for (const f of features) {
        const p = f.properties as FeatureProperties;
        totalNop += Number(p.nop_simulasi) || 0;

        if (p.kode_desa) desaSet.add(p.kode_desa);
        if (p.kode_seksi) seksiSet.add(p.kode_seksi);

        if (p.tanggal_update) {
            const year = new Date(p.tanggal_update).getFullYear();
            if (year >= 1990 && year <= 2026) {
                if (year >= 2015) recentCount++;
                totalAge += 2026 - year;
                validYearCount++;
            }
        }
    }

    return {
        totalBuildings: features.length,
        totalNop,
        avgNop: features.length > 0 ? totalNop / features.length : 0,
        uniqueDesaCount: desaSet.size,
        uniqueSeksiCount: seksiSet.size,
        recentDataPct: features.length > 0 ? (recentCount / features.length) * 100 : 0,
        avgDataAge: validYearCount > 0 ? totalAge / validYearCount : 0,
    };
}

// ─── Group By Seksi ───────────────────────────────────────

export function groupBySeksi(features: GeoJSON.Feature[], maxBars = 30): SeksiCount[] {
    const map = new Map<string, number>();
    for (const f of features) {
        const seksi = (f.properties as FeatureProperties).kode_seksi || 'N/A';
        map.set(seksi, (map.get(seksi) || 0) + 1);
    }

    const sorted = Array.from(map.entries())
        .map(([kode_seksi, count]) => ({ kode_seksi, count }))
        .sort((a, b) => b.count - a.count);

    if (sorted.length <= maxBars) return sorted;

    const top = sorted.slice(0, maxBars - 1);
    const othersCount = sorted.slice(maxBars - 1).reduce((s, v) => s + v.count, 0);
    top.push({ kode_seksi: 'Lainnya', count: othersCount });
    return top;
}

// ─── Top Desa By Count ────────────────────────────────────

export function topDesaByCount(features: GeoJSON.Feature[], n = 10): DesaCount[] {
    const map = new Map<string, number>();
    for (const f of features) {
        const desa = (f.properties as FeatureProperties).kode_desa || 'N/A';
        map.set(desa, (map.get(desa) || 0) + 1);
    }

    return Array.from(map.entries())
        .map(([kode_desa, count]) => ({ kode_desa, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, n);
}

// ─── Trend By Year ────────────────────────────────────────

export function trendByYear(features: GeoJSON.Feature[]): YearCount[] {
    const map = new Map<number, number>();
    for (const f of features) {
        const dateStr = (f.properties as FeatureProperties).tanggal_update;
        if (!dateStr) continue;
        const year = new Date(dateStr).getFullYear();
        if (year < 1990 || year > 2026) continue;
        map.set(year, (map.get(year) || 0) + 1);
    }

    return Array.from(map.entries())
        .map(([year, count]) => ({ year, count }))
        .sort((a, b) => a.year - b.year);
}

// ─── NOP Histogram ────────────────────────────────────────

export function nopHistogram(features: GeoJSON.Feature[], bins = 10): HistogramBin[] {
    const values: number[] = [];
    for (const f of features) {
        const v = Number((f.properties as FeatureProperties).nop_simulasi) || 0;
        values.push(v);
    }

    if (values.length === 0) return [];

    const min = Math.min(...values);
    const max = Math.max(...values);

    if (min === max) {
        return [{ label: formatIDRShort(min), min, max, count: values.length }];
    }

    const binWidth = (max - min) / bins;
    const result: HistogramBin[] = [];

    for (let i = 0; i < bins; i++) {
        const lo = min + i * binWidth;
        const hi = i === bins - 1 ? max + 1 : min + (i + 1) * binWidth;
        result.push({
            label: `${formatIDRShort(lo)}–${formatIDRShort(min + (i + 1) * binWidth)}`,
            min: lo,
            max: hi,
            count: 0,
        });
    }

    for (const v of values) {
        let idx = Math.floor((v - min) / binWidth);
        if (idx >= bins) idx = bins - 1;
        result[idx].count++;
    }

    return result;
}

// ─── Data Quality ─────────────────────────────────────────

export function computeDataQuality(features: GeoJSON.Feature[]): DataQuality {
    if (!features || features.length === 0) {
        return {
            totalFeatures: 0,
            uniqueDesa: 0,
            uniqueSeksi: 0,
            oldestYear: 0,
            newestYear: 0,
            recentPct: 0,
            nopMin: 0,
            nopMax: 0,
            nopMedian: 0,
        };
    }

    const desaSet = new Set<string>();
    const seksiSet = new Set<string>();
    const years: number[] = [];
    const nops: number[] = [];
    let recentCount = 0;

    for (const f of features) {
        const p = f.properties as FeatureProperties;
        if (p.kode_desa) desaSet.add(p.kode_desa);
        if (p.kode_seksi) seksiSet.add(p.kode_seksi);

        if (p.tanggal_update) {
            const year = new Date(p.tanggal_update).getFullYear();
            if (year >= 1990 && year <= 2026) {
                years.push(year);
                if (year >= 2015) recentCount++;
            }
        }

        nops.push(Number(p.nop_simulasi) || 0);
    }

    nops.sort((a, b) => a - b);
    const median =
        nops.length % 2 === 0
            ? (nops[nops.length / 2 - 1] + nops[nops.length / 2]) / 2
            : nops[Math.floor(nops.length / 2)];

    return {
        totalFeatures: features.length,
        uniqueDesa: desaSet.size,
        uniqueSeksi: seksiSet.size,
        oldestYear: years.length > 0 ? Math.min(...years) : 0,
        newestYear: years.length > 0 ? Math.max(...years) : 0,
        recentPct: features.length > 0 ? (recentCount / features.length) * 100 : 0,
        nopMin: nops.length > 0 ? nops[0] : 0,
        nopMax: nops.length > 0 ? nops[nops.length - 1] : 0,
        nopMedian: median,
    };
}
