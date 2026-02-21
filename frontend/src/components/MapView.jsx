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
export default function MapView({ geojsonData, mapRef, onFeatureClick, selectedFeatureId }) {
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const layerRef = useRef(null);

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

    // Render Polygons & Handle Selection
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map || !geojsonData) return;

        if (layerRef.current) map.removeLayer(layerRef.current);

        const layer = L.geoJSON(geojsonData, {
            style: (feature) => {
                const isSelected = feature.properties?.id === selectedFeatureId;
                return {
                    color: isSelected ? '#2563eb' : '#94a3b8', // Blue if selected, else gray border
                    weight: isSelected ? 3 : 1,
                    fillColor: isSelected ? '#3b82f6' : '#cbd5e1', // Bright blue if selected, else light gray fill
                    fillOpacity: isSelected ? 0.6 : 0.3,
                };
            },
            onEachFeature: (feature, layer) => {
                const props = feature.properties || {};

                // Interaction
                layer.on('mouseover', () => {
                    if (props.id !== selectedFeatureId) {
                        layer.setStyle({ fillOpacity: 0.5, weight: 2, color: '#64748b' });
                    }
                });

                layer.on('mouseout', () => {
                    if (props.id !== selectedFeatureId) {
                        layer.setStyle({ fillOpacity: 0.3, weight: 1, color: '#94a3b8' });
                    }
                });

                // Trigger App.jsx State Update on Click
                layer.on('click', () => {
                    if (onFeatureClick) {
                        // Pass properties up to App.jsx to update dashboard
                        onFeatureClick(props);

                        // Optional: slightly pan to feature
                        map.panTo(layer.getBounds().getCenter());
                    }
                });
            }
        });

        layer.addTo(map);
        layerRef.current = layer;

        // Auto-fit bounds on initial load if no selection is taking priority
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

    return (
        <div className="map-container">
            <div ref={mapContainerRef} className="leaflet-map" />
            <div className="map-legend">
                <h4>Building Footprints</h4>
                <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: '#cbd5e1', border: '1px solid #94a3b8' }} />
                    <span className="legend-label">Unselected Polygon</span>
                </div>
                <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: '#3b82f6', border: '2px solid #2563eb' }} />
                    <span className="legend-label">Selected Polygon</span>
                </div>
            </div>
        </div>
    );
}
