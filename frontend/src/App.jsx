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

    // AI & Map Integration States
    const [selectedFeature, setSelectedFeature] = useState(null);
    const [activeAILayer, setActiveAILayer] = useState(null);

    // Local explicit state to fix useChat bugs
    const [messages, setMessages] = useState([
        { id: 'initial-1', role: 'assistant', content: 'Welcome! I am your Autonomous WebGIS Agent. Ask me spatial questions, and I will write databases queries to show you the data on the map. Try asking: "Show me all public buildings" or "Find large commercial buildings".' }
    ]);
    const [chatInputBox, setChatInputBox] = useState('');
    const [isLoadingBackend, setIsLoadingBackend] = useState(false);
    const [selectedModel, setSelectedModel] = useState('openai/gpt-4o-mini');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const mapRef = useRef(null);

    // Load initial map data
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

    // Watch AI messages — no longer needed for tool invocations in Two-Pass mode
    // activeAILayer is set directly in customHandleSubmit

    // Interactivity: clicking map shapes
    const handleFeatureClick = (featureProperties) => {
        setSelectedFeature(featureProperties);
    };

    // Maintain legacy command logic for toggling boundaries without writing SQL via LLM 
    // We intercept form submission conditionally
    const customHandleSubmit = async (e) => {
        e.preventDefault();
        if (!chatInputBox.trim()) return;

        const msgLower = chatInputBox.toLowerCase();
        const submittedText = chatInputBox; // Save it before clearing
        setChatInputBox(''); // Clear input explicitly

        // Local Regex Intercept Pattern
        if (msgLower.includes('toggle district') || msgLower.includes('show kecamatan') || msgLower.includes('hide kecamatan')) {
            if (!kecamatanBoundary) {
                const data = await getBoundary('kecamatan');
                setKecamatanBoundary(data);
            }
            setShowKecamatan(prev => !prev);
            setMessages(prev => [...prev,
            { id: Date.now().toString(), role: 'user', content: submittedText },
            { id: (Date.now() + 1).toString(), role: 'assistant', content: 'I have toggled the Kecamatan (District) layer for you on the map.' }
            ]);
            return;
        }

        if (msgLower.includes('toggle subdistrict') || msgLower.includes('show kelurahan') || msgLower.includes('hide kelurahan')) {
            if (!kelurahanBoundary) {
                const data = await getBoundary('kelurahan');
                setKelurahanBoundary(data);
            }
            setShowKelurahan(prev => !prev);
            setMessages(prev => [...prev,
            { id: Date.now().toString(), role: 'user', content: submittedText },
            { id: (Date.now() + 1).toString(), role: 'assistant', content: 'I have toggled the Kelurahan (Sub-district) layer for you on the map.' }
            ]);
            return;
        }

        // ─── Two-Pass Architecture: Simple JSON fetch ───
        try {
            setIsLoadingBackend(true);

            // Push user message to chat immediately
            const newMsg = { id: Date.now().toString(), role: 'user', content: submittedText };
            setMessages(prev => [...prev, newMsg]);

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, newMsg],
                    model: selectedModel
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `Server error ${response.status}`);
            }

            const data = await response.json();

            // Push AI text response to chat
            if (data.text) {
                setMessages(prev => [...prev, {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: data.text,
                    indicator: data.indicator || null
                }]);
            }

            // Set GeoJSON directly on the map layer
            if (data.geojson && data.geojson.type === 'FeatureCollection' && data.geojson.features?.length > 0) {
                setActiveAILayer(data.geojson);
                console.log(`[Map] Rendering ${data.geojson.features.length} AI features`);
            }

        } catch (err) {
            console.error('Chat Error:', err);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: `❌ Error: ${err.message}`
            }]);
        } finally {
            setIsLoadingBackend(false);
        }
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
                    <h1>Autonomous WebGIS</h1>
                    {!loading && (
                        <div className="header-count">
                            {geojsonData.features.length} Features Loaded
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
                    activeAILayer={activeAILayer}
                />
            </section>

            {/* Right Column: Interactive Dashboard */}
            <DashboardSidebar
                selectedFeature={selectedFeature}
                messages={messages}
                input={chatInputBox}
                handleInputChange={(e) => setChatInputBox(e.target.value)}
                handleSubmit={customHandleSubmit}
                isLoading={isLoadingBackend}
                globalMetrics={globalMetrics}
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
            />
        </div>
    );
}

export default App;
