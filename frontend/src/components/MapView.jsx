import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons for Leaflet (though we mostly use polygons here)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/**
 * Enhanced MapView with CARTO Light and Dashboard Interactivity.
 */
export default function MapView({
    geojsonData, mapRef, onFeatureClick, selectedFeatureId,
    cityBoundary, kecamatanBoundary, kelurahanBoundary,
    showKecamatan, showKelurahan
}) {
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const buildingLayerRef = useRef(null);
    const cityLayerRef = useRef(null);
    const kecamatanLayerRef = useRef(null);
    const kelurahanLayerRef = useRef(null);

    // Initialize Map
    useEffect(() => {
        if (mapInstanceRef.current) return;

        const map = L.map(mapContainerRef.current, {
            center: [-6.17, 106.64],
            zoom: 13,
            zoomControl: false,
        });

        // Add zoom control at top-right
        L.control.zoom({ position: 'topright' }).addTo(map);

        // CARTO Light Base Map
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://osm.org/copyright">OSM</a>',
            subdomains: 'abcd',
            maxZoom: 20,
        }).addTo(map);

        mapInstanceRef.current = map;
        if (mapRef) mapRef.current = map;

        return () => {
            map.remove();
            mapInstanceRef.current = null;
        };
    }, []);

    // Render Buildings & Handle Selection
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map || !geojsonData) return;

        if (buildingLayerRef.current) map.removeLayer(buildingLayerRef.current);

        const layer = L.geoJSON(geojsonData, {
            style: (feature) => {
                const isSelected = feature.properties?.id === selectedFeatureId;
                return {
                    color: isSelected ? '#2563eb' : '#94a3b8',
                    weight: isSelected ? 3 : 1,
                    fillColor: isSelected ? '#3b82f6' : '#cbd5e1',
                    fillOpacity: isSelected ? 0.6 : 0.4,
                };
            },
            onEachFeature: (feature, layer) => {
                const props = feature.properties || {};

                layer.on('mouseover', () => {
                    if (props.id !== selectedFeatureId) {
                        layer.setStyle({ fillOpacity: 0.6, weight: 2, color: '#64748b' });
                    }
                });

                layer.on('mouseout', () => {
                    if (props.id !== selectedFeatureId) {
                        layer.setStyle({ fillOpacity: 0.4, weight: 1, color: '#94a3b8' });
                    }
                });

                layer.on('click', () => {
                    if (onFeatureClick) {
                        onFeatureClick(props);
                        map.panTo(layer.getBounds().getCenter());
                    }
                });
            }
        });

        layer.addTo(map);
        buildingLayerRef.current = layer;

        if (geojsonData.features && geojsonData.features.length > 0 && !selectedFeatureId) {
            try {
                const bounds = layer.getBounds();
                if (bounds.isValid()) {
                    map.fitBounds(bounds, { padding: [40, 40] });
                }
            } catch (e) {
                console.error('Error fitting bounds:', e);
            }
        }
    }, [geojsonData, selectedFeatureId, onFeatureClick]);

    // Render City Boundary
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map || !cityBoundary) return;

        if (cityLayerRef.current) map.removeLayer(cityLayerRef.current);

        const layer = L.geoJSON(cityBoundary, {
            style: { color: '#1f2937', weight: 3, fillOpacity: 0, fill: false },
            interactive: false
        });
        layer.addTo(map);
        cityLayerRef.current = layer;
    }, [cityBoundary]);

    // Render Kecamatan Boundary
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        if (kecamatanLayerRef.current) {
            map.removeLayer(kecamatanLayerRef.current);
            kecamatanLayerRef.current = null;
        }

        if (showKecamatan && kecamatanBoundary) {
            const layer = L.geoJSON(kecamatanBoundary, {
                style: { color: '#4b5563', weight: 1.5, dashArray: '5, 5', fillOpacity: 0, fill: false },
                interactive: false
            });
            layer.addTo(map);
            kecamatanLayerRef.current = layer;
        }
    }, [kecamatanBoundary, showKecamatan]);

    // Render Kelurahan Boundary
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        if (kelurahanLayerRef.current) {
            map.removeLayer(kelurahanLayerRef.current);
            kelurahanLayerRef.current = null;
        }

        if (showKelurahan && kelurahanBoundary) {
            const layer = L.geoJSON(kelurahanBoundary, {
                style: { color: '#9ca3af', weight: 1, dashArray: '3, 3', fillOpacity: 0, fill: false },
                interactive: false
            });
            layer.addTo(map);
            kelurahanLayerRef.current = layer;
        }
    }, [kelurahanBoundary, showKelurahan]);

    return (
        <div className="map-container">
            <div ref={mapContainerRef} className="leaflet-map" />
            <div className="map-legend">
                <h4>Layers & Footprints</h4>
                <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: '#cbd5e1', border: '1px solid #94a3b8' }} />
                    <span className="legend-label">Unselected Polygon</span>
                </div>
                <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: '#3b82f6', border: '2px solid #2563eb' }} />
                    <span className="legend-label">Selected Polygon</span>
                </div>
                {cityBoundary && (
                    <div className="legend-item">
                        <span className="legend-color" style={{ backgroundColor: 'transparent', border: '3px solid #1f2937' }} />
                        <span className="legend-label">City Boundary</span>
                    </div>
                )}
                {showKecamatan && (
                    <div className="legend-item">
                        <span className="legend-color" style={{ backgroundColor: 'transparent', border: '1.5px dashed #4b5563' }} />
                        <span className="legend-label">Kecamatan</span>
                    </div>
                )}
                {showKelurahan && (
                    <div className="legend-item">
                        <span className="legend-color" style={{ backgroundColor: 'transparent', border: '1px dashed #9ca3af' }} />
                        <span className="legend-label">Kelurahan</span>
                    </div>
                )}
            </div>
        </div>
    );
}
