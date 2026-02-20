import React from 'react';
import { MapContainer, TileLayer, GeoJSON, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const MapView = ({ geoData }) => {
    const center = [-6.1783, 106.6319]; // Tangerang
    const zoom = 13;

    const geojsonStyle = {
        fillColor: '#10b981',
        weight: 0.5,
        opacity: 0.8,
        color: '#059669',
        fillOpacity: 0.4,
    };

    const onEachFeature = (feature, layer) => {
        if (feature.properties) {
            const popupContent = `
        <div style="font-family: system-ui, -apple-system, sans-serif; padding: 4px;">
          <h3 style="margin: 0 0 8px 0; font-weight: 800; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; color: #0f172a; font-size: 14px;">Building Detail</h3>
          <div style="display: grid; gap: 4px;">
            ${Object.entries(feature.properties)
                    .filter(([_, v]) => v !== null && v !== '')
                    .map(([k, v]) => `
                <div style="display: flex; justify-content: space-between; font-size: 11px;">
                  <span style="color: #64748b; font-weight: 600; text-transform: uppercase; margin-right: 12px;">${k}</span>
                  <span style="color: #1e293b; font-weight: 500;">${v}</span>
                </div>
              `).join('')}
          </div>
        </div>
      `;
            layer.bindPopup(popupContent, { maxWidth: 300 });
        }

        layer.on({
            mouseover: (e) => {
                const l = e.target;
                l.setStyle({
                    fillOpacity: 0.7,
                    weight: 2,
                    fillColor: '#34d399'
                });
            },
            mouseout: (e) => {
                const l = e.target;
                l.setStyle(geojsonStyle);
            },
            click: (e) => {
                const l = e.target;
                l.openPopup();
            }
        });
    };

    return (
        <MapContainer
            center={center}
            zoom={zoom}
            style={{ height: '100%', width: '100%', background: '#0f172a' }}
            zoomControl={false}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            <ZoomControl position="bottomright" />
            {geoData && (
                <GeoJSON
                    data={geoData}
                    style={geojsonStyle}
                    onEachFeature={onEachFeature}
                />
            )}
        </MapContainer>
    );
};

export default MapView;
