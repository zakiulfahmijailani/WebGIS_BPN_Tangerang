'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Map, PanelLeftClose, PanelRightClose, PanelLeft, PanelRight } from 'lucide-react';
import LeftSidebar from './components/LeftSidebar';
import RightPanel from './components/RightPanel';
import LayerBox from './components/LayerBox';
import AttributeTableModal from './components/AttributeTableModal';
import { RealtimeListener } from './components/RealtimeListener';
import type { FlyToCommand } from './components/MapLibreMap';
import bbox from '@turf/bbox';

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
  const [flyToCommand, setFlyToCommand] = useState<FlyToCommand | null>(null);

  // Modal State
  const [isAttributeModalOpen, setIsAttributeModalOpen] = useState(false);
  const [attributeLayerName, setAttributeLayerName] = useState('');
  const [attributeData, setAttributeData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [attributeEndpoint, setAttributeEndpoint] = useState<string | undefined>(undefined);

  // Sidebar collapse states (natural integration)
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);

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

    if (hasData || hasStyle) {
      setAiLayer(prev => ({
        geojson: geojson || prev.geojson,
        style: style || prev.style,
        layerType: style?.type || 'fill',
        visible: true
      }));
    }
    setActiveQuery('Last AI query');
  }, []);

  // Handle uploaded GeoJSON from LayerBox
  const handleGeoJSONUploaded = useCallback((data: GeoJSON.FeatureCollection) => {
    setAiLayer(prev => ({
      ...prev,
      geojson: data,
      visible: true,
    }));
  }, []);

  const handleLayerAction = useCallback((action: string, layerId: string) => {

    // Helper to get spatial data for a layer
    const getLayerData = async (): Promise<GeoJSON.FeatureCollection | null> => {
      if (layerId === 'buildings') return buildingsData;
      if (layerId.startsWith('uploaded')) return aiLayer.geojson;
      if (['city', 'kecamatan', 'kelurahan'].includes(layerId)) {
        const res = await fetch(`/api/boundaries/${layerId}`);
        if (res.ok) return await res.json();
      }
      return null;
    };

    if (action === 'view-attributes') {
      let name = layerId;
      let data = null;
      let endpoint = undefined;

      if (layerId === 'city') { name = 'City Boundary'; endpoint = '/api/boundaries/city'; }
      else if (layerId === 'kecamatan') { name = 'Kecamatan'; endpoint = '/api/boundaries/kecamatan'; }
      else if (layerId === 'kelurahan') { name = 'Kelurahan'; endpoint = '/api/boundaries/kelurahan'; }
      else if (layerId === 'buildings') { name = 'Buildings'; data = buildingsData; }
      else if (layerId.startsWith('uploaded')) { name = 'Uploaded Layer'; data = aiLayer.geojson; }

      setAttributeLayerName(name);
      setAttributeData(data);
      setAttributeEndpoint(endpoint);
      setIsAttributeModalOpen(true);
    }
    else if (action === 'zoom') {
      getLayerData().then(data => {
        if (data && data.features.length > 0) {
          const mapBbox = bbox(data as any) as [number, number, number, number];
          setFlyToCommand(prev => ({
            center: [0, 0], // Ignored by MapLibre if boundingBox is present
            zoom: 0,
            boundingBox: mapBbox
          }));
        }
      });
    }
    else if (action.startsWith('export-')) {
      const format = action.split('-')[1]; // e.g. geojson, shapefile, flatgeobuf
      getLayerData().then(data => {
        if (!data) return;

        let content = '';
        let mimeType = 'text/plain';

        if (format === 'geojson') {
          content = JSON.stringify(data, null, 2);
          mimeType = 'application/geo+json';
        } else {
          // Mock for unsupported clientside formats
          content = `Mock binary data for ${format.toUpperCase()}`;
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        // Provide a sensible filename
        const cleanName = layerId.replace('uploaded-', 'custom_layer_');
        link.download = `${cleanName}_export.${format === 'shapefile' ? 'zip' : format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      });
    }
    else if (action === 'delete') {
      // Toggle visibility state off for built-in layers
      if (layerId === 'city') setShowCity(false);
      else if (layerId === 'kecamatan') setShowKecamatan(false);
      else if (layerId === 'kelurahan') setShowKelurahan(false);
      else if (layerId === 'buildings') setShowBuildings(false);

      // Let LayerBox natively handle removing 'uploaded' layer from its local list
      // However, if it's the actively stored AI layer, clear it from map globals too:
      if (layerId.startsWith('uploaded')) {
        setAiLayer({ geojson: null, style: null, layerType: 'fill', visible: false });
      }
    }
  }, [buildingsData, aiLayer.geojson]);

  return (
    <main className="h-screen w-screen flex overflow-hidden bg-slate-100">
      {/* Supabase Realtime Bridge (invisible) */}
      <RealtimeListener sessionId={sessionId} onMapUpdate={handleRealtimeUpdate} />

      {/* LEFT PANEL — Sidebar */}
      <LeftSidebar
        isCollapsed={isLeftCollapsed}
        onToggle={() => setIsLeftCollapsed(!isLeftCollapsed)}
      />

      {/* CENTER — MapLibre Map (flex-1) */}
      <div className="flex-1 h-full relative overflow-hidden">
        <MapLibreMap
          aiLayer={aiLayer}
          buildingsData={buildingsData}
          showBuildings={showBuildings}
          showCity={showCity}
          showKecamatan={showKecamatan}
          showKelurahan={showKelurahan}
          flyToCommand={flyToCommand}
        />

        {/* Floating Layer Box (top-left, matching reference) */}
        <div className="absolute top-6 left-4 z-10 transition-all duration-300">
          <LayerBox
            showCity={showCity}
            setShowCity={setShowCity}
            showBuildings={showBuildings}
            setShowBuildings={setShowBuildings}
            showKecamatan={showKecamatan}
            setShowKecamatan={setShowKecamatan}
            showKelurahan={showKelurahan}
            setShowKelurahan={setShowKelurahan}
            onGeoJSONUploaded={handleGeoJSONUploaded}
            onLayerAction={handleLayerAction}
          />
        </div>

        {/* AI Result Badge (floating over map) */}
        {aiLayer.geojson && aiLayer.geojson.features?.length > 0 && (
          <div className="absolute bottom-6 right-4 z-10 glass-dark px-4 py-2 shadow-xl text-white">
            <p className="text-xs font-medium flex items-center gap-2">
              <span className="text-blue-400">✨</span> AI Result: {aiLayer.geojson.features.length} features
            </p>
          </div>
        )}
      </div>

      {/* RIGHT PANEL — Chat & Metrics */}
      <RightPanel
        isCollapsed={isRightCollapsed}
        onToggle={() => setIsRightCollapsed(!isRightCollapsed)}
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

      <AttributeTableModal
        isOpen={isAttributeModalOpen}
        onClose={() => setIsAttributeModalOpen(false)}
        layerName={attributeLayerName}
        data={attributeData}
        endpoint={attributeEndpoint}
      />
    </main>
  );
}
