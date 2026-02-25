import React from 'react';

export default function LayerToggles({ showCity, showKecamatan, showKelurahan, onToggle }) {
    return (
        <div className="card">
            <div className="card-title">🗂️ Boundary Layers</div>
            <div className="layer-toggles">
                <div className="toggle-row">
                    <span>🏙️ Kota (City)</span>
                    <input
                        type="checkbox"
                        className="toggle-switch"
                        checked={showCity}
                        onChange={() => onToggle('city')}
                    />
                </div>
                <div className="toggle-row">
                    <span>📍 Kecamatan</span>
                    <input
                        type="checkbox"
                        className="toggle-switch"
                        checked={showKecamatan}
                        onChange={() => onToggle('kecamatan')}
                    />
                </div>
                <div className="toggle-row">
                    <span>📌 Kelurahan</span>
                    <input
                        type="checkbox"
                        className="toggle-switch"
                        checked={showKelurahan}
                        onChange={() => onToggle('kelurahan')}
                    />
                </div>
            </div>
        </div>
    );
}
