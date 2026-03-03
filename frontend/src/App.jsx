import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import LoginPage from './LoginPage';
import DashboardHeader from './components/DashboardHeader';
import KPICards from './components/KPICards';
import MapView from './components/MapView';
import LiveFeed from './components/LiveFeed';
import TrendChart from './components/TrendChart';
import TypeDoughnut from './components/TypeDoughnut';
import ResourceBar from './components/ResourceBar';
import AIInsights from './components/AIInsights';
import FeatureDetail from './components/FeatureDetail';
import ChatWidget from './components/ChatWidget';

export default function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    // Data
    const [geojsonData, setGeojsonData] = useState(null);
    const [cityBoundary, setCityBoundary] = useState(null);
    const [kecamatanBoundary, setKecamatanBoundary] = useState(null);
    const [kelurahanBoundary, setKelurahanBoundary] = useState(null);

    // Filters
    const [filterType, setFilterType] = useState('all');
    const [filterArea, setFilterArea] = useState('all');

    // Layer toggles
    const [showCity, setShowCity] = useState(true);
    const [showKecamatan, setShowKecamatan] = useState(false);
    const [showKelurahan, setShowKelurahan] = useState(false);

    // UI
    const [selectedFeature, setSelectedFeature] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const mapRef = useRef(null);

    useEffect(() => {
        if (!isLoggedIn) return;
        async function loadData() {
            try {
                const [bRes, cityRes, kecRes, kelRes] = await Promise.all([
                    axios.get('/api/buildings'),
                    axios.get('/api/boundaries/city'),
                    axios.get('/api/boundaries/kecamatan'),
                    axios.get('/api/boundaries/kelurahan'),
                ]);
                setGeojsonData(bRes.data);
                setCityBoundary(cityRes.data);
                setKecamatanBoundary(kecRes.data);
                setKelurahanBoundary(kelRes.data);
            } catch (err) {
                setError('Failed to connect to backend (port 5000).');
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [isLoggedIn]);

    const allFeatures = useMemo(() => geojsonData?.features || [], [geojsonData]);

    // Filtered features (global filter)
    const filteredFeatures = useMemo(() => {
        return allFeatures.filter(f => {
            const type = f.properties?.type || '';
            const area = parseFloat(f.properties?.area) || 0;
            if (filterType !== 'all' && type !== filterType) return false;
            if (filterArea === 'small' && area >= 500) return false;
            if (filterArea === 'medium' && (area < 500 || area >= 2000)) return false;
            if (filterArea === 'large' && area < 2000) return false;
            return true;
        });
    }, [allFeatures, filterType, filterArea]);

    // Filtered GeoJSON for the map
    const filteredGeoJSON = useMemo(() => {
        if (!geojsonData) return null;
        return { type: 'FeatureCollection', features: filteredFeatures };
    }, [geojsonData, filteredFeatures]);

    const avgArea = useMemo(() => {
        if (filteredFeatures.length === 0) return 0;
        return filteredFeatures.reduce((s, f) => s + (parseFloat(f.properties?.area) || 0), 0) / filteredFeatures.length;
    }, [filteredFeatures]);

    const handleLayerToggle = (layer) => {
        if (layer === 'city') setShowCity(v => !v);
        if (layer === 'kecamatan') setShowKecamatan(v => !v);
        if (layer === 'kelurahan') setShowKelurahan(v => !v);
    };

    if (!isLoggedIn) return <LoginPage onLogin={setIsLoggedIn} />;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen w-screen bg-slate-50 flex-col gap-4">
                <div className="w-10 h-10 border-3 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
                <span className="text-sm text-slate-400">Loading cadastral data...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-screen w-screen bg-slate-50 flex-col gap-3">
                <span className="text-4xl">⚠️</span>
                <span className="text-sm text-red-500 max-w-sm text-center">{error}</span>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen overflow-hidden relative font-sans bg-slate-100">
            {/* ═══ MAP BACKGROUND ═══ */}
            <div className="absolute inset-0 z-0">
                <MapView
                    geojsonData={filteredGeoJSON}
                    mapRef={mapRef}
                    onFeatureClick={setSelectedFeature}
                    selectedFeatureId={selectedFeature?.id}
                    cityBoundary={cityBoundary}
                    kecamatanBoundary={kecamatanBoundary}
                    kelurahanBoundary={kelurahanBoundary}
                    showCity={showCity}
                    showKecamatan={showKecamatan}
                    showKelurahan={showKelurahan}
                    onLayerToggle={handleLayerToggle}
                />
            </div>

            {/* ═══ FLOATING HEADER (Top Left) ═══ */}
            <div className="absolute top-4 left-4 z-10">
                <div className="glass-panel rounded-2xl shadow-lg border border-white/40 overflow-hidden">
                    <DashboardHeader
                        features={allFeatures}
                        filterType={filterType} onFilterType={setFilterType}
                        filterArea={filterArea} onFilterArea={setFilterArea}
                    />
                </div>
            </div>

            {/* ═══ LEFT PANEL (Metrics & Charts) ═══ */}
            <div className="absolute top-24 left-4 bottom-4 w-80 z-10 flex flex-col gap-3 pointer-events-none">
                <div className="flex-1 overflow-y-auto custom-scroll pr-2 pointer-events-auto flex flex-col gap-3">
                    <div className="glass-panel p-3 rounded-2xl shadow-lg border border-white/40">
                        <KPICards features={allFeatures} filteredFeatures={filteredFeatures} />
                    </div>
                    <div className="glass-panel p-3 rounded-2xl shadow-lg border border-white/40">
                        <TrendChart features={filteredFeatures} />
                    </div>
                    <div className="glass-panel p-3 rounded-2xl shadow-lg border border-white/40">
                        <TypeDoughnut features={filteredFeatures} />
                    </div>
                </div>
            </div>

            {/* ═══ RIGHT PANEL (Live Feed & Details) ═══ */}
            <div className="absolute top-4 right-4 bottom-4 w-80 z-10 flex flex-col gap-3 pointer-events-none">
                <div className="flex-1 overflow-y-auto custom-scroll pl-2 pointer-events-auto flex flex-col gap-3">
                    {/* Feature Detail floats at top if selected */}
                    {selectedFeature && (
                        <div className="glass-panel p-4 rounded-2xl shadow-lg border border-white/40 animate-in fade-in slide-in-from-right-4">
                            <FeatureDetail feature={selectedFeature} avgArea={avgArea} />
                        </div>
                    )}

                    <div className="glass-panel p-0 rounded-2xl shadow-lg border border-white/40 flex-1 overflow-hidden min-h-[300px] flex flex-col">
                        <LiveFeed features={filteredFeatures} onItemClick={setSelectedFeature} />
                    </div>

                    <div className="glass-panel p-3 rounded-2xl shadow-lg border border-white/40">
                        <ResourceBar features={filteredFeatures} />
                    </div>

                    <div className="glass-panel p-0 rounded-2xl shadow-lg border border-white/40">
                        <AIInsights features={filteredFeatures} />
                    </div>
                </div>
            </div>
        </div>
    );
}
