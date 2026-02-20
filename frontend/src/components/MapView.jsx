import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons for Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/**
 * Enhanced MapView with Polygon support and building popups.
 */
export default function MapView({ geojsonData, mapRef }) {
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const layerRef = useRef(null);

    useEffect(() => {
        if (mapInstanceRef.current) return;

        const map = L.map(mapContainerRef.current, {
            center: [-6.17, 106.64],
            zoom: 13,
            zoomControl: false, // Custom position
        });

        // Add zoom control at top-right
        L.control.zoom({ position: 'topright' }).addTo(map);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
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

    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map || !geojsonData) return;

        if (layerRef.current) map.removeLayer(layerRef.current);

        const layer = L.geoJSON(geojsonData, {
            style: {
                color: '#3b82f6',
                weight: 1.5,
                fillColor: '#60a5fa',
                fillOpacity: 0.35,
            },
            onEachFeature: (feature, layer) => {
                const props = feature.properties || {};
                const area = props.area || 'N/A';
                const type = props.type || 'Building';
                const id = props.id || 'Unknown';

                const popupContent = `
                    <div class="p-1">
                        <h3 class="font-bold text-blue-600 mb-1">Building Details</h3>
                        <div class="text-xs space-y-1">
                            <p><b>ID:</b> ${id}</p>
                            <p><b>Type:</b> <span class="capitalize">${type}</span></p>
                            <p><b>Area:</b> ${area} m²</p>
                        </div>
                    </div>
                `;

                layer.bindPopup(popupContent);

                // Interaction
                layer.on('mouseover', () => {
                    layer.setStyle({ fillOpacity: 0.6, weight: 2 });
                });
                layer.on('mouseout', () => {
                    layer.setStyle({ fillOpacity: 0.35, weight: 1.5 });
                });

                // Bonus: Information context logic is handled in DashboardSidebar 
                // but we can emit a click event if needed.
            }
        });

        layer.addTo(map);
        layerRef.current = layer;

        if (geojsonData.features && geojsonData.features.length > 0) {
            try {
                const bounds = layer.getBounds();
                if (bounds.isValid()) {
                    map.fitBounds(bounds, { padding: [20, 20] });
                }
            } catch (e) {
                console.error('Error fitting bounds:', e);
            }
        }
    }, [geojsonData]);

    return (
        <div className="map-container">
            <div ref={mapContainerRef} className="leaflet-map" />
            <div className="map-legend">
                <h4>Tangerang Footprints</h4>
                <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: '#60a5fa', border: '1px solid #3b82f6' }} />
                    <span className="legend-label">Building Footprint</span>
                </div>
            </div>
        </div>
    );
}
