import React, { useState, useEffect } from 'react';
import MapView from './components/MapView';
import DashboardSidebar from './components/DashboardSidebar';

function App() {
    const [geoData, setGeoData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const apiUrl = '/api/buildings';
                const response = await fetch(apiUrl);
                if (!response.ok) {
                    throw new Error(`Failed to fetch: ${response.statusText}`);
                }
                const data = await response.json();
                setGeoData(data);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching data:', err);
                setError(err.message);
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-slate-900">
            <DashboardSidebar geoData={geoData} loading={loading} error={error} />
            <div className="flex-1 relative">
                <MapView geoData={geoData} />
            </div>
        </div>
    );
}

export default App;
