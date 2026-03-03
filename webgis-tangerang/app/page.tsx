'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Layers, Map, Eye, EyeOff } from 'lucide-react';
import ChatPanel from './components/ChatPanel';
import AnalyticsPanel from './components/AnalyticsPanel';
import { RealtimeListener } from './components/RealtimeListener';
import type { FlyToCommand } from './components/MapLibreMap';

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
    <main className="h-screen w-screen flex overflow-hidden bg-slate-950">
      {/* Supabase Realtime Bridge (invisible) */}
      <RealtimeListener sessionId={sessionId} onMapUpdate={handleRealtimeUpdate} />

      {/* LEFT PANEL — Analytics Dashboard (25%) */}
      <div className="w-[25%] min-w-[280px] h-full border-r border-slate-800/60">
        <AnalyticsPanel
          geojsonData={aiLayer.geojson}
          buildingsData={buildingsData}
          activeQuery={activeQuery}
        />
      </div>

      {/* CENTER — MapLibre Map (50%) */}
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

        {/* Layer Toggle Controls (floating over map) */}
        <div className="absolute top-3 left-3 z-10">
          <button
            onClick={() => setShowLayerPanel(!showLayerPanel)}
            className="w-9 h-9 bg-slate-900/80 backdrop-blur-md border border-slate-700/50
                       rounded-lg flex items-center justify-center text-white
                       hover:bg-slate-800/90 transition-all shadow-xl"
          >
            <Layers className="w-4 h-4" />
          </button>

          {showLayerPanel && (
            <div className="absolute top-11 left-0 bg-slate-900/90 backdrop-blur-md border 
                            border-slate-700/50 rounded-xl p-3 space-y-2 shadow-2xl min-w-[180px]">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium mb-2">
                Map Layers
              </p>
              <LayerToggle
                label="City Boundary"
                active={showCity}
                color="#3b82f6"
                onToggle={() => setShowCity(!showCity)}
              />
              <LayerToggle
                label="Buildings"
                active={showBuildings}
                color="#4ade80"
                onToggle={() => setShowBuildings(!showBuildings)}
              />
              <LayerToggle
                label="Kecamatan"
                active={showKecamatan}
                color="#f472b6"
                onToggle={() => setShowKecamatan(!showKecamatan)}
              />
              <LayerToggle
                label="Kelurahan"
                active={showKelurahan}
                color="#c084fc"
                onToggle={() => setShowKelurahan(!showKelurahan)}
              />
            </div>
          )}
        </div>

        {/* AI Result Badge (floating over map) */}
        {aiLayer.geojson && aiLayer.geojson.features?.length > 0 && (
          <div className="absolute bottom-4 left-4 z-10 bg-slate-900/80 backdrop-blur-md
                          border border-cyan-500/30 rounded-xl px-3 py-2 shadow-xl shadow-cyan-500/10">
            <p className="text-[10px] text-cyan-400 font-medium">
              🔍 AI Result: {aiLayer.geojson.features.length} features
            </p>
          </div>
        )}
      </div>

      {/* RIGHT PANEL — Chat UI (25%) */}
      <div className="w-[25%] min-w-[300px] h-full border-l border-slate-800/60">
        <ChatPanel
          sessionId={sessionId}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          onChatResponse={handleChatResponse}
          onMapCommand={(cmd) => setFlyToCommand({ ...cmd })}
        />
      </div>
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
      <span className="text-xs text-slate-300 flex-1 text-left">{label}</span>
      {active ? (
        <Eye className="w-3 h-3 text-slate-400" />
      ) : (
        <EyeOff className="w-3 h-3 text-slate-500" />
      )}
    </button>
  );
}
