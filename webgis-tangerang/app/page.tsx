'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic'; // Keep dynamic for the dynamic import
import { Layers, Eye, EyeOff, Map } from 'lucide-react';
import LeftSidebar from './components/LeftSidebar'; // New
import RightPanel from './components/RightPanel'; // New
import { RealtimeListener } from './components/RealtimeListener'; // Keep RealtimeListener
import type { FlyToCommand } from './components/MapLibreMap'; // Keep type import

// IMPORTANT: MapLibre must be loaded without SSR (uses window/document)
const MapLibreMap = dynamic(() => import('./components/MapLibreMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Map className="w-10 h-10 text-cyan-400 animate-pulse" />
        <p className="text-sm text-slate-400">Loading map...</p>
      </div>
    </div>
  ),
});

export default function Home() {
  const [aiLayer, setAiLayer] = useState<{
    geojson: GeoJSON.FeatureCollection | null;
    style: any;
    layerType: string;
    visible: boolean;
  }>({
    geojson: null,
    style: null,
    layerType: 'fill',
    visible: true,
  });
  const [buildingsData, setBuildingsData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [selectedModel, setSelectedModel] = useState('google/gemini-2.5-flash');
  const [activeQuery, setActiveQuery] = useState('');
  const [showBuildings, setShowBuildings] = useState(true);
  const [showCity, setShowCity] = useState(true);
  const [showKecamatan, setShowKecamatan] = useState(true);
  const [showKelurahan, setShowKelurahan] = useState(false);
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [flyToCommand, setFlyToCommand] = useState<FlyToCommand | null>(null);

  // Generate stable session ID
  const sessionId = useMemo(() => {
    if (typeof window !== 'undefined') {
      let id = sessionStorage.getItem('webgis-session-id');
      if (!id) {
        id = `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        sessionStorage.setItem('webgis-session-id', id);
      }
      return id;
    }
    return 'server-render';
  }, []);

  // Load buildings on mount
  useEffect(() => {
    fetch('/api/buildings')
      .then((res) => res.json())
      .then((data) => {
        if (data.features) {
          setBuildingsData(data);
        }
      })
      .catch((err) => console.error('Failed to load buildings:', err));
  }, []);

  // Handle realtime map updates from Supabase
  const handleRealtimeUpdate = useCallback((geojson: GeoJSON.FeatureCollection) => {
    setAiLayer(prev => ({
      ...prev,
      geojson: geojson,
      visible: true
    }));
  }, []);

  // Handle dual-output from chat
  const handleChatResponse = useCallback((response: any) => {
    const { text, geojson, style, hasData, hasStyle } = response;

    // The chat text is already handled inside ChatPanel's local state, 
    // so here we just update the map layer
    if (hasData || hasStyle) {
      setAiLayer(prev => ({
        geojson: geojson || prev.geojson, // Keep old data if only style changed
        style: style || prev.style,       // Keep old style if only data changed
        layerType: style?.type || 'fill',
        visible: true
      }));
    }
    setActiveQuery('Last AI query');
  }, []);

  return (
    <main className="h-screen w-screen flex overflow-hidden bg-slate-100">
      {/* Supabase Realtime Bridge (invisible) */}
      <RealtimeListener sessionId={sessionId} onMapUpdate={handleRealtimeUpdate} />

      {/* LEFT PANEL — Sidebar (Fixed 240px) */}
      <LeftSidebar />

      {/* CENTER — MapLibre Map (flex-1) */}
      <div className="flex-1 h-full relative">
        <MapLibreMap
          aiLayer={aiLayer}
          buildingsData={buildingsData}
          showBuildings={showBuildings}
          showCity={showCity}
          showKecamatan={showKecamatan}
          showKelurahan={showKelurahan}
          flyToCommand={flyToCommand}
        />

        {/* Small glassmorphism search bar (top-right) */}
        <div className="absolute top-4 right-4 z-10">
          <div className="glass px-4 py-2 flex items-center gap-2">
            <span className="text-slate-400">🔍</span>
            <input
              type="text"
              placeholder="Search locations..."
              className="bg-transparent border-none outline-none text-sm w-48 text-slate-700 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Layer Toggle Controls (Mobile / Small Screen only ideally, but let's hide it completely since it's in the RightPanel now) */}
        {/* We removed the floating layer panel to embrace the 3-column layout */}

        {/* AI Result Badge (floating over map) */}
        {aiLayer.geojson && aiLayer.geojson.features?.length > 0 && (
          <div className="absolute bottom-6 left-6 z-10 glass px-4 py-2 shadow-xl shadow-cyan-500/5">
            <p className="text-xs text-slate-700 font-medium flex items-center gap-2">
              <span className="text-blue-500">✨</span> AI Result: {aiLayer.geojson.features.length} features
            </p>
          </div>
        )}
      </div>

      {/* RIGHT PANEL — Chat & Metrics (Fixed 360px) */}
      <RightPanel
        sessionId={sessionId}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        onChatResponse={handleChatResponse}
        onMapCommand={(cmd: FlyToCommand) => setFlyToCommand({ ...cmd })}
        aiLayer={aiLayer}
        geojsonData={aiLayer.geojson}
        buildingsData={buildingsData}
        activeQuery={activeQuery}
        showCity={showCity}
        setShowCity={setShowCity}
        showBuildings={showBuildings}
        setShowBuildings={setShowBuildings}
        showKecamatan={showKecamatan}
        setShowKecamatan={setShowKecamatan}
        showKelurahan={showKelurahan}
        setShowKelurahan={setShowKelurahan}
      />
    </main>
  );
}

// ─── Layer Toggle Sub-component ───
function LayerToggle({
  label,
  active,
  color,
  onToggle,
}: {
  label: string;
  active: boolean;
  color: string;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg 
                 hover:bg-slate-800/60 transition-all group"
    >
      <div
        className="w-3 h-3 rounded-sm border transition-all"
        style={{
          backgroundColor: active ? color : 'transparent',
          borderColor: color,
        }}
      />
      <span className="text-xs text-slate-600 font-medium flex-1 text-left">{label}</span>
      {active ? (
        <Eye className="w-3 h-3 text-slate-500" />
      ) : (
        <EyeOff className="w-3 h-3 text-slate-400" />
      )}
    </button>
  );
}
