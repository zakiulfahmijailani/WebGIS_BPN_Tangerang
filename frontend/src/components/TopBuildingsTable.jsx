import React, { useMemo } from 'react';

export default function TopBuildingsTable({ features, onRowClick }) {
    const topBuildings = useMemo(() => {
        return [...features]
            .filter(f => parseFloat(f.properties?.area) > 0)
            .sort((a, b) => parseFloat(b.properties.area) - parseFloat(a.properties.area))
            .slice(0, 10)
            .map((f, i) => ({
                rank: i + 1,
                id: f.properties.id,
                type: f.properties.type || 'Unknown',
                area: parseFloat(f.properties.area),
                props: f.properties,
            }));
    }, [features]);

    const maxArea = topBuildings[0]?.area || 1;

    return (
        <div className="card">
            <div className="card-title">🏆 Top 10 Largest Buildings</div>
            <table className="top-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Type</th>
                        <th>Area (m²)</th>
                        <th style={{ width: '35%' }}>Size</th>
                    </tr>
                </thead>
                <tbody>
                    {topBuildings.map((b) => (
                        <tr key={b.id} onClick={() => onRowClick && onRowClick(b.props)}>
                            <td className="rank">{b.rank}</td>
                            <td>{b.type}</td>
                            <td style={{ fontWeight: 600, color: '#f1f5f9' }}>{b.area.toLocaleString()}</td>
                            <td>
                                <div className="area-bar" style={{ width: `${(b.area / maxArea) * 100}%` }} />
                            </td>
                        </tr>
                    ))}
                    {topBuildings.length === 0 && (
                        <tr><td colSpan={4} style={{ textAlign: 'center', padding: 20, color: '#64748b' }}>No data</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
