import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import LoginPage from './LoginPage';
import MapView from './components/MapView';
import ModeSelector from './components/ModeSelector';
import StatsCards from './components/StatsCards';
import LayerToggles from './components/LayerToggles';
import TypeBarChart from './components/TypeBarChart';
import AreaPieChart from './components/AreaPieChart';
import AreaTreemap from './components/AreaTreemap';
import TopBuildingsTable from './components/TopBuildingsTable';
import FeatureDetail from './components/FeatureDetail';
import EditPanel from './components/EditPanel';
import ReportExport from './components/ReportExport';
import ChatWidget from './components/ChatWidget';

export default function App() {
    // Auth
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    // Data
    const [geojsonData, setGeojsonData] = useState(null);
    const [cityBoundary, setCityBoundary] = useState(null);
    const [kecamatanBoundary, setKecamatanBoundary] = useState(null);
    const [kelurahanBoundary, setKelurahanBoundary] = useState(null);

    // UI State
    const [selectedFeature, setSelectedFeature] = useState(null);
    const [activeMode, setActiveMode] = useState('viewing');
    const [showCity, setShowCity] = useState(true);
    const [showKecamatan, setShowKecamatan] = useState(false);
    const [showKelurahan, setShowKelurahan] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const mapRef = useRef(null);

    // Load data
    useEffect(() => {
        if (!isLoggedIn) return;
        async function loadData() {
            try {
                const [buildingsRes, cityRes, kecRes, kelRes] = await Promise.all([
                    axios.get('/api/buildings'),
                    axios.get('/api/boundaries/city'),
                    axios.get('/api/boundaries/kecamatan'),
                    axios.get('/api/boundaries/kelurahan'),
                ]);
                setGeojsonData(buildingsRes.data);
                setCityBoundary(cityRes.data);
                setKecamatanBoundary(kecRes.data);
                setKelurahanBoundary(kelRes.data);
            } catch (err) {
                console.error('Failed to load data:', err);
                setError('Failed to connect to backend. Ensure it runs on port 5000.');
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [isLoggedIn]);

    const features = useMemo(() => geojsonData?.features || [], [geojsonData]);
    const avgArea = useMemo(() => {
        if (features.length === 0) return 0;
        return features.reduce((s, f) => s + (parseFloat(f.properties?.area) || 0), 0) / features.length;
    }, [features]);

    const handleLayerToggle = (layer) => {
        if (layer === 'city') setShowCity(v => !v);
        if (layer === 'kecamatan') setShowKecamatan(v => !v);
        if (layer === 'kelurahan') setShowKelurahan(v => !v);
    };

    // Login gate
    if (!isLoggedIn) return <LoginPage onLogin={setIsLoggedIn} />;

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="spinner" />
                <div style={{ color: '#94a3b8', fontSize: 14 }}>Loading Tangerang cadastral data...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="loading-screen">
                <div style={{ fontSize: 48 }}>⚠️</div>
                <div style={{ color: '#dc2626', fontSize: 14, maxWidth: 400, textAlign: 'center' }}>{error}</div>
            </div>
        );
    }

    return (
        <div className="app-layout">
            {/* ═══ LEFT: Map (60%) ═══ */}
            <section className="map-section">
                <header className="map-header">
                    <span style={{ fontSize: 20 }}>🗺️</span>
                    <h1>WebGIS Tangerang</h1>
                    <span className="badge">{features.length.toLocaleString()} Buildings</span>
                </header>
                <MapView
                    geojsonData={geojsonData}
                    mapRef={mapRef}
                    onFeatureClick={setSelectedFeature}
                    selectedFeatureId={selectedFeature?.id}
                    cityBoundary={cityBoundary}
                    kecamatanBoundary={kecamatanBoundary}
                    kelurahanBoundary={kelurahanBoundary}
                    showCity={showCity}
                    showKecamatan={showKecamatan}
                    showKelurahan={showKelurahan}
                />
            </section>

            {/* ═══ RIGHT: Dashboard (40%) ═══ */}
            <section className="dashboard-section">
                <header className="dashboard-header">
                    <h2>📊 Analytics</h2>
                    <ModeSelector activeMode={activeMode} onModeChange={setActiveMode} />
                </header>

                <div className="dashboard-scroll">
                    {/* Summary Stats (always visible) */}
                    <StatsCards features={features} />

                    {/* Layer toggles (always visible) */}
                    <LayerToggles
                        showCity={showCity}
                        showKecamatan={showKecamatan}
                        showKelurahan={showKelurahan}
                        onToggle={handleLayerToggle}
                    />

                    {/* ── VIEWING mode ── */}
                    {activeMode === 'viewing' && (
                        <>
                            {selectedFeature && (
                                <FeatureDetail feature={selectedFeature} avgArea={avgArea} />
                            )}
                            <TypeBarChart features={features} />
                            <AreaPieChart features={features} />
                            <AreaTreemap features={features} />
                            <TopBuildingsTable features={features} onRowClick={setSelectedFeature} />
                        </>
                    )}

                    {/* ── EDITING mode ── */}
                    {activeMode === 'editing' && (
                        <>
                            <EditPanel feature={selectedFeature} />
                            {selectedFeature && (
                                <FeatureDetail feature={selectedFeature} avgArea={avgArea} />
                            )}
                        </>
                    )}

                    {/* ── REPORTING mode ── */}
                    {activeMode === 'reporting' && (
                        <>
                            <ReportExport mapContainerSelector=".leaflet-map" />
                            {selectedFeature && (
                                <FeatureDetail feature={selectedFeature} avgArea={avgArea} />
                            )}
                            <TypeBarChart features={features} />
                            <AreaPieChart features={features} />
                        </>
                    )}

                    <div className="section-divider" />
                    <ChatWidget />
                </div>
            </section>
        </div>
    );
}
