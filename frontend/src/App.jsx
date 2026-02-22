import React, { useState, useEffect, useRef } from 'react';
import MapView from './components/MapView';
import DashboardSidebar from './components/DashboardSidebar';
import { getBuildings, getMetrics, getBoundary } from './api';
import './App.css';

function App() {
    const [geojsonData, setGeojsonData] = useState({ type: 'FeatureCollection', features: [] });
    const [globalMetrics, setGlobalMetrics] = useState(null);

    // Boundary States
    const [cityBoundary, setCityBoundary] = useState(null);
    const [kecamatanBoundary, setKecamatanBoundary] = useState(null);
    const [kelurahanBoundary, setKelurahanBoundary] = useState(null);

    // Toggle States
    const [showKecamatan, setShowKecamatan] = useState(false);
    const [showKelurahan, setShowKelurahan] = useState(false);

    // State for interactivity between Map and Dashboard
    const [selectedFeature, setSelectedFeature] = useState(null);
    const [chatMessages, setChatMessages] = useState([
        { role: 'agent', text: 'Welcome to the Agentic WebGIS. You can ask me to toggle boundary layers, tracking "district" or "sub-district", or click Polygons.' }
    ]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const mapRef = useRef(null);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [polygons, metrics, cityLayer] = await Promise.all([
                    getBuildings(),
                    getMetrics(),
                    getBoundary('city')
                ]);

                setGeojsonData(polygons);
                setGlobalMetrics(metrics);
                setCityBoundary(cityLayer);

            } catch (err) {
                console.error('Failed to load data:', err);
                setError('Connection error: Is the backend server running?');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Callback triggered by MapView when a polygon is clicked
    const handleFeatureClick = (featureProperties) => {
        setSelectedFeature(featureProperties);

        // Automatically add a context message to the chatbot
        const id = featureProperties?.id || 'Unknown';
        const area = featureProperties?.area ? `${featureProperties.area} m²` : 'unknown size';
        const type = featureProperties?.type || 'building';

        setChatMessages(prev => [
            ...prev,
            {
                role: 'agent',
                text: `You selected building ID ${id}. It is classified as a ${type} with an area of ${area}. Updating charts...`
            }
        ]);
    };

    const handleChatCommand = async (userMsg) => {
        setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        const msgLower = userMsg.toLowerCase();

        let response = "I can only help toggle boundary layers like 'district' (Kecamatan) or 'sub-district' (Kelurahan) right now.";

        try {
            if (msgLower.includes('kecamatan') || msgLower.includes('district')) {
                if (!kecamatanBoundary) {
                    const data = await getBoundary('kecamatan');
                    setKecamatanBoundary(data);
                }
                setShowKecamatan(prev => {
                    response = !prev ? "Toggling Kecamatan boundaries ON." : "Toggling Kecamatan boundaries OFF.";
                    return !prev;
                });
            } else if (msgLower.includes('kelurahan') || msgLower.includes('sub-district') || msgLower.includes('subdistrict')) {
                if (!kelurahanBoundary) {
                    const data = await getBoundary('kelurahan');
                    setKelurahanBoundary(data);
                }
                setShowKelurahan(prev => {
                    response = !prev ? "Toggling Kelurahan boundaries ON." : "Toggling Kelurahan boundaries OFF.";
                    return !prev;
                });
            }
        } catch (e) {
            response = "Error fetching the requested boundary layer.";
        }

        setTimeout(() => {
            setChatMessages(prev => [...prev, { role: 'agent', text: response }]);
        }, 400);
    };

    return (
        <div className="app">
            {loading && (
                <div className="loading-overlay">
                    <div className="loading-spinner"></div>
                    <p>Fetching geospatial data and boundaries...</p>
                </div>
            )}
            {error && (
                <div className="error-overlay text-center">
                    <p className="mb-4 text-red-600 font-semibold">⚠️ {error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                        Retry Connection
                    </button>
                </div>
            )}

            {/* Left Column: Interactive Map */}
            <section className="map-area">
                <header className="app-header">
                    <span className="text-xl">🗺️</span>
                    <h1>Tangerang Spatial Analytics</h1>
                    {!loading && (
                        <div className="header-count">
                            {geojsonData.features.length} Features
                        </div>
                    )}
                </header>

                <MapView
                    geojsonData={geojsonData}
                    mapRef={mapRef}
                    onFeatureClick={handleFeatureClick}
                    selectedFeatureId={selectedFeature?.id}
                    cityBoundary={cityBoundary}
                    kecamatanBoundary={kecamatanBoundary}
                    kelurahanBoundary={kelurahanBoundary}
                    showKecamatan={showKecamatan}
                    showKelurahan={showKelurahan}
                />
            </section>

            {/* Right Column: Interactive Dashboard */}
            <DashboardSidebar
                selectedFeature={selectedFeature}
                chatMessages={chatMessages}
                onChatCommand={handleChatCommand}
                globalMetrics={globalMetrics}
            />
        </div>
    );
}

export default App;
