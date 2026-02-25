import React from 'react';

export default function StatsCards({ features }) {
    const totalBuildings = features.length;

    const typeSet = new Set();
    let totalArea = 0;

    features.forEach(f => {
        const area = parseFloat(f.properties?.area) || 0;
        totalArea += area;
        if (f.properties?.type) typeSet.add(f.properties.type);
    });

    const avgArea = totalBuildings > 0 ? totalArea / totalBuildings : 0;

    const formatArea = (val) => {
        if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)} km²`;
        if (val >= 1_000) return `${(val / 1_000).toFixed(1)}k m²`;
        return `${Math.round(val)} m²`;
    };

    return (
        <div className="stats-grid">
            <div className="stat-card blue">
                <div className="stat-value">{totalBuildings.toLocaleString()}</div>
                <div className="stat-label">Total Buildings</div>
            </div>
            <div className="stat-card green">
                <div className="stat-value">{formatArea(totalArea)}</div>
                <div className="stat-label">Total Area</div>
            </div>
            <div className="stat-card purple">
                <div className="stat-value">{typeSet.size}</div>
                <div className="stat-label">Building Types</div>
            </div>
            <div className="stat-card cyan">
                <div className="stat-value">{formatArea(avgArea)}</div>
                <div className="stat-label">Avg. Area</div>
            </div>
        </div>
    );
}
