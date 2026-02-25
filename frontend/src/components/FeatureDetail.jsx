import React from 'react';

export default function FeatureDetail({ feature, avgArea }) {
    if (!feature) return null;

    const area = parseFloat(feature.area) || 0;
    const ratio = avgArea > 0 ? Math.min((area / avgArea) * 100, 200) : 0;
    const ratioLabel = avgArea > 0 ? (area / avgArea).toFixed(1) : '–';
    const barColor = ratio > 100 ? '#10b981' : ratio > 60 ? '#f59e0b' : '#ef4444';

    return (
        <div className="card feature-detail">
            <div className="card-title" style={{ marginBottom: 12 }}>
                🔍 Selected Building
                <span style={{
                    marginLeft: 'auto', fontSize: 10, padding: '2px 8px',
                    background: 'rgba(59,130,246,0.15)', color: '#60a5fa',
                    borderRadius: 10, border: '1px solid rgba(59,130,246,0.3)'
                }}>
                    ID: {feature.id || '–'}
                </span>
            </div>

            <div className="detail-grid">
                <div className="detail-item">
                    <span className="detail-label">Type</span>
                    <span className="detail-value">{feature.type || 'Unknown'}</span>
                </div>
                <div className="detail-item">
                    <span className="detail-label">Area</span>
                    <span className="detail-value">{area > 0 ? `${area.toLocaleString()} m²` : 'N/A'}</span>
                </div>
            </div>

            <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>
                        vs. Dataset Average
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: barColor }}>
                        {ratioLabel}×
                    </span>
                </div>
                <div className="comparison-bar-track">
                    <div
                        className="comparison-bar-fill"
                        style={{
                            width: `${Math.min(ratio, 100)}%`,
                            background: `linear-gradient(90deg, ${barColor}, ${barColor}88)`,
                        }}
                    />
                </div>
                <div className="comparison-labels">
                    <span>0</span>
                    <span>Avg ({avgArea > 0 ? Math.round(avgArea).toLocaleString() : '–'} m²)</span>
                    <span>2× Avg</span>
                </div>
            </div>

            {/* Show all extra properties */}
            <div style={{ marginTop: 16, borderTop: '1px solid #334155', paddingTop: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: 8 }}>
                    All Properties
                </div>
                {Object.entries(feature)
                    .filter(([k]) => !['geom', 'geometry'].includes(k))
                    .map(([key, val]) => (
                        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid rgba(51,65,85,0.3)' }}>
                            <span style={{ fontSize: 11, color: '#64748b' }}>{key}</span>
                            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, textAlign: 'right', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {String(val)}
                            </span>
                        </div>
                    ))
                }
            </div>
        </div>
    );
}
