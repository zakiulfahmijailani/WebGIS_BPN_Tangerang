import React, { useState, useEffect } from 'react';

export default function EditPanel({ feature }) {
    const [formData, setFormData] = useState({ type: '', area: '' });

    useEffect(() => {
        if (feature) {
            setFormData({
                type: feature.type || '',
                area: feature.area || '',
            });
        }
    }, [feature]);

    if (!feature) {
        return (
            <div className="card edit-panel">
                <div className="card-title">✏️ Edit Feature</div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                    Click a building on the map to edit its properties.
                </p>
            </div>
        );
    }

    return (
        <div className="card edit-panel">
            <div className="card-title">
                ✏️ Edit Feature
                <span style={{
                    marginLeft: 'auto', fontSize: 10, padding: '2px 8px',
                    background: 'var(--accent-glow)', color: 'var(--accent)',
                    borderRadius: 10, border: '1px solid rgba(37,99,235,0.2)'
                }}>
                    ID: {feature.id || '–'}
                </span>
            </div>

            <div className="edit-field">
                <label>Building Type</label>
                <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                    <option value="">Select type...</option>
                    <option value="residential">Residential</option>
                    <option value="commercial">Commercial</option>
                    <option value="industrial">Industrial</option>
                    <option value="public">Public</option>
                    <option value="mixed">Mixed</option>
                </select>
            </div>

            <div className="edit-field">
                <label>Area (m²)</label>
                <input
                    type="number"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    placeholder="Enter area in m²"
                />
            </div>

            <button
                className="export-btn"
                style={{ borderStyle: 'solid', marginTop: 8 }}
                onClick={() => alert('Feature editing saved locally (no backend persistence).')}
            >
                💾 Save Changes (Local Only)
            </button>
        </div>
    );
}
