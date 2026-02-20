import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/**
 * Leaflet map displaying healthcare facility points as red circle markers.
 */
export default function MapView({ geojsonData, mapRef }) {
    const containerRef = useRef(null);
    const mapInstance = useRef(null);
    const layerRef = useRef(null);

    // Initialize map once
    useEffect(() => {
        if (mapInstance.current) return;

        const map = L.map(containerRef.current, {
            center: [-6.17, 106.64],
            zoom: 13,
            zoomControl: true,
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution:
                '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
            subdomains: 'abcd',
            maxZoom: 19,
        }).addTo(map);

        mapInstance.current = map;
        if (mapRef) mapRef.current = map;

        return () => {
            map.remove();
            mapInstance.current = null;
        };
    }, []);

    // Render healthcare points
    useEffect(() => {
        const map = mapInstance.current;
        if (!map || !geojsonData) return;

        if (layerRef.current) map.removeLayer(layerRef.current);

        const features = geojsonData.features || [];

        const layer = L.geoJSON(
            { type: 'FeatureCollection', features },
            {
                pointToLayer: (_f, latlng) =>
                    L.circleMarker(latlng, {
                        radius: 8,
                        fillColor: '#e53e3e',
                        color: '#c53030',
                        weight: 1,
                        fillOpacity: 0.85,
                        opacity: 1,
                    }),
                onEachFeature: (feature, layer) => {
                    const p = feature.properties || {};
                    const lines = [];
                    if (p.name) lines.push(`<b style="font-size:14px">${p.name}</b>`);
                    if (p.amenity) lines.push(`<b>Type:</b> ${p.amenity}`);
                    if (p.addr_street) lines.push(`<b>Address:</b> ${p.addr_street}`);
                    if (p.phone) lines.push(`<b>Phone:</b> ${p.phone}`);
                    if (lines.length === 0) lines.push('<i>No details available</i>');

                    layer.bindPopup(lines.join('<br>'), {
                        maxWidth: 280,
                        className: 'healthcare-popup',
                    });

                    layer.on('mouseover', () =>
                        layer.setStyle({ radius: 11, fillOpacity: 1, weight: 2 })
                    );
                    layer.on('mouseout', () =>
                        layer.setStyle({ radius: 8, fillOpacity: 0.85, weight: 1 })
                    );
                },
            }
        );

        layer.addTo(map);
        layerRef.current = layer;

        if (features.length > 0) {
            const bounds = layer.getBounds();
            if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
        }
    }, [geojsonData]);

    return (
        <div className="map-container">
            <div ref={containerRef} className="leaflet-map" />
            <div className="map-legend">
                <h4>Healthcare Facilities</h4>
                <div className="legend-item">
                    <span
                        className="legend-color"
                        style={{
                            backgroundColor: '#e53e3e',
                            borderRadius: '50%',
                            border: '1px solid #c53030',
                        }}
                    />
                    <span className="legend-label">Facility Location</span>
                </div>
            </div>
        </div>
    );
}
