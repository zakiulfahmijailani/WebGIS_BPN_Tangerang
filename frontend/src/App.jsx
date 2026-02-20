import React, { useState, useEffect, useRef } from 'react';
import MapView from './components/MapView';
import { getHealthcare } from './api';
import './App.css';

function App() {
    const [geojsonData, setGeojsonData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [count, setCount] = useState(0);
    const mapRef = useRef(null);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getHealthcare();
            setGeojsonData(data);
            setCount(data?.features?.length || 0);
        } catch (err) {
            console.error('Failed to load healthcare data:', err);
            setError('Failed to load data. Is the backend running on port 8000?');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    return (
        <div className="app">
            <div className="app-header">
                <h1>🏥 Tangerang Healthcare Facilities</h1>
                {!loading && !error && (
                    <span className="header-count">{count} facilities loaded</span>
                )}
            </div>

            <div className="app-content">
                <div className="map-area">
                    {loading && (
                        <div className="loading-overlay">
                            <div className="loading-spinner" />
                            <p>Loading healthcare data...</p>
                        </div>
                    )}
                    {error && (
                        <div className="error-overlay">
                            <p>⚠️ {error}</p>
                            <button onClick={loadData}>Retry</button>
                        </div>
                    )}
                    <MapView geojsonData={geojsonData} mapRef={mapRef} />
                </div>
            </div>
        </div>
    );
}

export default App;
