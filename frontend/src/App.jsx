import React, { useState, useEffect, useRef } from 'react';
import MapView from './components/MapView';
import DashboardSidebar from './components/DashboardSidebar';
import { getBuildings, getMetrics } from './api';
import './App.css';

function App() {
    const [geojsonData, setGeojsonData] = useState({ type: 'FeatureCollection', features: [] });
    const [globalMetrics, setGlobalMetrics] = useState(null);

    // State for interactivity between Map and Dashboard
    const [selectedFeature, setSelectedFeature] = useState(null);
    const [chatMessages, setChatMessages] = useState([
        { role: 'agent', text: 'Welcome to the Agentic WebGIS. Click on any building on the map to analyze it.' }
    ]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const mapRef = useRef(null);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch polygons
                const polygons = await getBuildings();
                setGeojsonData(polygons);

                // Fetch global metrics
                const metrics = await getMetrics();
                setGlobalMetrics(metrics);

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
        const id = featureProperties.id || 'Unknown';
        const area = featureProperties.area ? `${featureProperties.area} m²` : 'unknown size';
        const type = featureProperties.type || 'building';

        setChatMessages(prev => [
            ...prev,
            {
                role: 'agent',
                text: `You selected building ID ${id}. It is classified as a ${type} with an area of ${area}. Updating charts...`
            }
        ]);
    };

    return (
        <div className="app">
            {loading && (
                <div className="loading-overlay">
                    <div className="loading-spinner"></div>
                    <p>Fetching geospatial data...</p>
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
                />
            </section>

            {/* Right Column: Interactive Dashboard */}
            <DashboardSidebar
                selectedFeature={selectedFeature}
                chatMessages={chatMessages}
                globalMetrics={globalMetrics}
            />
        </div>
    );
}

export default App;
