import React, { useState, useEffect, useRef } from 'react';
import MapView from './components/MapView';
import DashboardSidebar from './components/DashboardSidebar';
import { getBuildings } from './api';
import './App.css';

function App() {
    const [geojsonData, setGeojsonData] = useState({ type: 'FeatureCollection', features: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const mapRef = useRef(null);

    useEffect(() => {
        const loadMapData = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await getBuildings();
                setGeojsonData(data);
            } catch (err) {
                console.error('Failed to load buildings:', err);
                setError('Connection error: Is the backend server running?');
            } finally {
                setLoading(false);
            }
        };
        loadMapData();
    }, []);

    return (
        <div className="app">
            <header className="app-header">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">🏛️</span>
                    <h1>Tangerang WebGIS Dashboard</h1>
                </div>
                {!loading && (
                    <div className="header-count">
                        {geojsonData.features.length} Buildings Mapped
                    </div>
                )}
            </header>

            <main className="app-content">
                <DashboardSidebar />

                <section className="map-area">
                    {loading && (
                        <div className="loading-overlay">
                            <div className="loading-spinner"></div>
                            <p>Fetching geospatial data...</p>
                        </div>
                    )}
                    {error && (
                        <div className="error-overlay text-center">
                            <p className="mb-4">⚠️ {error}</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="bg-blue-500 text-white px-4 py-2 rounded-lg"
                            >
                                Retry Connection
                            </button>
                        </div>
                    )}
                    <MapView geojsonData={geojsonData} mapRef={mapRef} />
                </section>
            </main>
        </div>
    );
}

export default App;
