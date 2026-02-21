import React, { useEffect, useRef } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
} from 'chart.js';
import { Bar, Doughnut, Radar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
    CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend,
    ArcElement, RadialLinearScale, PointElement, LineElement, Filler
);

export default function DashboardSidebar({ selectedFeature, chatMessages, globalMetrics }) {
    const chatEndRef = useRef(null);

    // Auto-scroll chat when new messages arrive
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    // Handle Mock Chart Data Based on globalMetrics
    // In a real app, this would be accurately parsed from the backend
    const buildTypeLabels = globalMetrics?.distribution?.map(d => d.type) || ['Residential', 'Commercial', 'Industrial', 'Public'];
    const buildTypeData = globalMetrics?.distribution?.map(d => parseInt(d.count)) || [3000, 1200, 500, 300];

    const doughnutData = {
        labels: buildTypeLabels,
        datasets: [{
            data: buildTypeData,
            backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'],
            borderWidth: 0,
        }]
    };

    const barData = {
        labels: ['North Dist.', 'South Dist.', 'East Dist.', 'West Dist.', 'Central'],
        datasets: [{
            label: 'Buildings',
            data: [1200, 1900, 800, 1500, 2000], // Mock regional data
            backgroundColor: '#93c5fd',
            borderRadius: 4,
        }]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10 } } }
        }
    };

    const barOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 } } },
            x: { grid: { display: false }, ticks: { font: { size: 10 } } }
        }
    };

    // Section C: Contextual Radar Chart (Appears on click)
    const renderRadarChart = () => {
        if (!selectedFeature) return null;

        // Mock comparative metrics logic based on selected polygon area
        const featureArea = parseFloat(selectedFeature.area || 0);
        const avgArea = globalMetrics?.summary?.total_area ? (parseFloat(globalMetrics.summary.total_area) / parseInt(globalMetrics.summary.total_buildings)).toFixed(2) : 250;

        const radarData = {
            labels: ['Area', 'Perimeter', 'Accessibility', 'Density', 'Value'],
            datasets: [
                {
                    label: `Selected ID: ${selectedFeature.id?.substring(0, 8) || 'N/A'}`,
                    data: [featureArea > 0 ? 80 : 40, 65, 59, 90, 81], // Mocks prioritizing Area
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    pointBackgroundColor: 'rgba(59, 130, 246, 1)',
                },
                {
                    label: 'Tangerang Average',
                    data: [50, 50, 50, 50, 50],
                    backgroundColor: 'rgba(148, 163, 184, 0.2)',
                    borderColor: 'rgba(148, 163, 184, 1)',
                    pointBackgroundColor: 'rgba(148, 163, 184, 1)',
                }
            ]
        };

        return (
            <div className="chart-card">
                <h4>Comparative Analysis</h4>
                <div className="chart-wrapper">
                    <Radar data={radarData} options={{ maintainAspectRatio: false }} />
                </div>
            </div>
        );
    };

    return (
        <aside className="dashboard-panel">

            {/* SECTION A: Chatbot */}
            <section className="dashboard-chat">
                <div className="chat-header">
                    <span className="text-blue-600">🤖</span>
                    <span>WebGIS Assistant</span>
                </div>
                <div className="chat-history">
                    {chatMessages.map((msg, i) => (
                        <div key={i} className={`message ${msg.role}`}>
                            {msg.text}
                        </div>
                    ))}
                    <div ref={chatEndRef} />
                </div>
                <div className="chat-input-area">
                    <input
                        type="text"
                        className="chat-input"
                        placeholder="AI query interface disabled in this view..."
                        disabled
                    />
                </div>
            </section>

            {/* SECTION B: Metrics & Charts */}
            <section className="dashboard-charts">
                <h3 className="section-title">Spatial Analytics</h3>

                {/* Radar Chart (Contextual based on map click) */}
                {renderRadarChart()}

                <div className="chart-card">
                    <h4>Building Typology</h4>
                    <div className="chart-wrapper">
                        <Doughnut data={doughnutData} options={chartOptions} />
                    </div>
                </div>

                <div className="chart-card">
                    <h4>Regional Distribution</h4>
                    <div className="chart-wrapper">
                        <Bar data={barData} options={barOptions} />
                    </div>
                </div>
            </section>

            {/* SECTION C: Summary Stats */}
            <section className="dashboard-summary">
                {selectedFeature ? (
                    <div className="info-card">
                        <h4><span className="text-xl">📍</span> Selected Feature Details</h4>
                        <div className="info-grid mt-3">
                            <span className="label">ID:</span>
                            <span className="val">{selectedFeature.id || 'N/A'}</span>
                            <span className="label">Type:</span>
                            <span className="val capitalize">{selectedFeature.type || 'Unknown'}</span>
                            <span className="label">Area:</span>
                            <span className="val">{selectedFeature.area ? `${selectedFeature.area} m²` : 'Data Unavailable'}</span>
                        </div>
                    </div>
                ) : (
                    <div className="stats-grid">
                        <div className="stat-box">
                            <div className="stat-label">Total Buildings</div>
                            <div className="stat-value">{globalMetrics?.summary?.total_buildings || '...'}</div>
                        </div>
                        <div className="stat-box">
                            <div className="stat-label">Total Area Covered</div>
                            <div className="stat-value">
                                {globalMetrics?.summary?.total_area ? (globalMetrics.summary.total_area / 1000000).toFixed(2) : '...'} km²
                            </div>
                        </div>
                    </div>
                )}
            </section>

        </aside>
    );
}
