import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const TYPE_COLORS = {
    'residential': '#2563eb',
    'commercial': '#d97706',
    'industrial': '#dc2626',
    'public': '#059669',
    'mixed': '#7c3aed',
};

function getTypeColor(type) {
    if (!type) return '#94a3b8';
    const key = type.toLowerCase();
    for (const [k, v] of Object.entries(TYPE_COLORS)) {
        if (key.includes(k)) return v;
    }
    return '#94a3b8';
}

export default function MapView({
    geojsonData, mapRef, onFeatureClick, selectedFeatureId,
    cityBoundary, kecamatanBoundary, kelurahanBoundary,
    showCity, showKecamatan, showKelurahan, onLayerToggle,
}) {
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const buildingLayerRef = useRef(null);
    const cityLayerRef = useRef(null);
    const kecamatanLayerRef = useRef(null);
    const kelurahanLayerRef = useRef(null);

    // Init map
    useEffect(() => {
        if (mapInstanceRef.current) return;
        const map = L.map(mapContainerRef.current, {
            center: [-6.17, 106.64], zoom: 13, zoomControl: false,
        });
        L.control.zoom({ position: 'topright' }).addTo(map);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; CARTO &copy; OSM', maxZoom: 20,
        }).addTo(map);
        mapInstanceRef.current = map;
        if (mapRef) mapRef.current = map;
        return () => { map.remove(); mapInstanceRef.current = null; };
    }, []);

    // Buildings
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map || !geojsonData) return;
        if (buildingLayerRef.current) map.removeLayer(buildingLayerRef.current);

        const layer = L.geoJSON(geojsonData, {
            style: (feature) => {
                const isSelected = feature.properties?.id === selectedFeatureId;
                const typeColor = getTypeColor(feature.properties?.type);
                return {
                    color: isSelected ? '#0f172a' : typeColor,
                    weight: isSelected ? 2.5 : 0.8,
                    fillColor: typeColor,
                    fillOpacity: isSelected ? 0.8 : 0.5,
                };
            },
            onEachFeature: (feature, lyr) => {
                const props = feature.properties || {};
                lyr.on('mouseover', () => {
                    if (props.id !== selectedFeatureId) { lyr.setStyle({ fillOpacity: 0.7, weight: 1.5 }); lyr.bringToFront(); }
                });
                lyr.on('mouseout', () => {
                    if (props.id !== selectedFeatureId) { lyr.setStyle({ fillOpacity: 0.5, weight: 0.8 }); }
                });
                lyr.on('click', () => {
                    if (onFeatureClick) { onFeatureClick(props); map.panTo(lyr.getBounds().getCenter(), { animate: true }); }
                });
                lyr.bindTooltip(
                    `<strong>${props.type || 'Unknown'}</strong><br/>Area: ${props.area ? Number(props.area).toLocaleString() + ' m²' : 'N/A'}<br/>ID: ${props.id || '–'}`,
                    { className: 'light-tooltip', direction: 'top', offset: [0, -10] }
                );
            }
        });
        layer.addTo(map);
        buildingLayerRef.current = layer;
    }, [geojsonData, selectedFeatureId, onFeatureClick]);

    // City boundary
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;
        if (cityLayerRef.current) { map.removeLayer(cityLayerRef.current); cityLayerRef.current = null; }
        if (showCity && cityBoundary) {
            const layer = L.geoJSON(cityBoundary, {
                style: { color: '#0f172a', weight: 3, fillOpacity: 0, fill: false },
                interactive: false
            });
            layer.addTo(map);
            cityLayerRef.current = layer;
        }
    }, [cityBoundary, showCity]);

    // Kecamatan
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;
        if (kecamatanLayerRef.current) { map.removeLayer(kecamatanLayerRef.current); kecamatanLayerRef.current = null; }
        if (showKecamatan && kecamatanBoundary) {
            const layer = L.geoJSON(kecamatanBoundary, {
                style: { color: '#475569', weight: 1.5, dashArray: '6, 4', fillOpacity: 0, fill: false },
                onEachFeature: (feature, lyr) => {
                    const name = feature.properties?.kecamatan_name || feature.properties?.name || '';
                    if (name) lyr.bindTooltip(name, { permanent: false, direction: 'center', className: 'light-tooltip' });
                }
            });
            layer.addTo(map);
            kecamatanLayerRef.current = layer;
        }
    }, [kecamatanBoundary, showKecamatan]);

    // Kelurahan
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;
        if (kelurahanLayerRef.current) { map.removeLayer(kelurahanLayerRef.current); kelurahanLayerRef.current = null; }
        if (showKelurahan && kelurahanBoundary) {
            const layer = L.geoJSON(kelurahanBoundary, {
                style: { color: '#94a3b8', weight: 1, dashArray: '3, 3', fillOpacity: 0, fill: false },
                interactive: false
            });
            layer.addTo(map);
            kelurahanLayerRef.current = layer;
        }
    }, [kelurahanBoundary, showKelurahan]);

    const layers = [
        { key: 'city', label: 'City', checked: showCity },
        { key: 'kecamatan', label: 'Kecamatan', checked: showKecamatan },
        { key: 'kelurahan', label: 'Kelurahan', checked: showKelurahan },
    ];

    return (
        <div className="map-container relative w-full h-full">
            <div ref={mapContainerRef} className="leaflet-map w-full h-full" />

            {/* Legend Overlay */}
            <div className="map-legend absolute bottom-4 left-[350px] bg-white/90 backdrop-blur-md p-4 rounded-xl border border-slate-200 shadow-lg z-[1000] min-w-[200px]">
                <div className="mb-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Building Types</h4>
                    <div className="space-y-1.5">
                        {Object.entries(TYPE_COLORS).map(([type, color]) => (
                            <div className="flex items-center gap-2 text-xs text-slate-600" key={type}>
                                <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                                <span className="capitalize">{type}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="pt-3 border-t border-slate-100">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Boundary Layers</h4>
                    <div className="space-y-2">
                        {layers.map(l => (
                            <div key={l.key} className="flex items-center justify-between gap-4 py-0.5">
                                <span className="text-xs font-medium text-slate-600">{l.label}</span>
                                <input
                                    type="checkbox"
                                    className="w-8 h-4 bg-slate-200 rounded-full appearance-none cursor-pointer checked:bg-blue-600 transition-colors relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:w-3 after:h-3 after:rounded-full after:transition-transform checked:after:translate-x-4"
                                    checked={l.checked}
                                    onChange={() => onLayerToggle && onLayerToggle(l.key)}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <style>{`
                .light-tooltip {
                    background: rgba(255,255,255,0.96) !important;
                    color: #0f172a !important;
                    border: 1px solid #e2e8f0 !important;
                    border-radius: 8px !important;
                    padding: 8px 12px !important;
                    font-family: 'Inter', sans-serif !important;
                    font-size: 12px !important;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.1) !important;
                }
            `}</style>
        </div>
    );
}
