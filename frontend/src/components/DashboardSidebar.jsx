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

ChartJS.register(
    CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend,
    ArcElement, RadialLinearScale, PointElement, LineElement, Filler
);

// Fallback ErrorBoundary for robust rendering
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true };
    }
    componentDidCatch(error, errorInfo) {
        console.error("Dashboard error:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return <div className="text-sm p-4 text-red-500 bg-red-50 border border-red-200 rounded">Error loading visualization.</div>;
        }
        return this.props.children;
    }
}

export default function DashboardSidebar({
    selectedFeature = null,
    messages = [],
    input = '',
    handleInputChange = () => { },
    handleSubmit = (e) => { e.preventDefault(); },
    isLoading = false,
    globalMetrics = null,
    selectedModel = 'openai/gpt-4o-mini',
    onModelChange = () => { }
}) {
    const chatEndRef = useRef(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    // Extremely safe fallback for arbitrary data shapes
    const safeDist = Array.isArray(globalMetrics?.distribution) ? globalMetrics.distribution : [];
    const buildTypeLabels = safeDist.length > 0 ? safeDist.map(d => d.type) : ['Residential', 'Commercial', 'Industrial', 'Public'];
    const buildTypeData = safeDist.length > 0 ? safeDist.map(d => parseInt(d.count) || 0) : [3000, 1200, 500, 300];

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
            data: [1200, 1900, 800, 1500, 2000],
            backgroundColor: '#93c5fd',
            borderRadius: 4,
        }]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10 } } } }
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

    const renderRadarChart = () => {
        if (!selectedFeature) return null;

        const featureArea = parseFloat(selectedFeature?.area || 0);

        const radarData = {
            labels: ['Area', 'Perimeter', 'Accessibility', 'Density', 'Value'],
            datasets: [
                {
                    label: `Selected ID: ${selectedFeature?.id?.toString().substring(0, 8) || 'N/A'}`,
                    data: [featureArea > 0 ? 80 : 40, 65, 59, 90, 81],
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
            <ErrorBoundary>
                <div className="chart-card">
                    <h4>Comparative Analysis</h4>
                    <div className="chart-wrapper">
                        <Radar data={radarData} options={{ maintainAspectRatio: false }} />
                    </div>
                </div>
            </ErrorBoundary>
        );
    };

    return (
        <aside className="dashboard-panel">
            {/* SECTION A: Chatbot */}
            <section className="dashboard-chat">
                <div className="chat-header">
                    <span className="text-blue-600">🤖</span>
                    <span>Autonomous AI Assistant</span>
                </div>
                <div className="chat-history">
                    {(messages || []).map(m => (
                        <div key={m.id || Math.random()} className={`message ${m.role === 'user' ? 'user' : 'agent'}`}>
                            {m.role === 'assistant' && m.indicator && (
                                <div className="mb-1 flex items-center">
                                    <div className={`w-2 h-2 rounded-full ${m.indicator === 'green' ? 'bg-green-500' : 'bg-red-500'} mr-1`}></div>
                                    <span className="text-[9px] text-slate-400 uppercase tracking-wider">
                                        {m.indicator === 'green' ? 'Cached Vector Hit' : 'New Live Analysis'}
                                    </span>
                                </div>
                            )}
                            {/* Hide the messy internal system updates from the user UI */}
                            {(m.content || '').startsWith('[System Update]') ? (
                                <span className="text-xs text-slate-400 italic">Processing Map Interaction...</span>
                            ) : (
                                m.content
                            )}

                            {/* Render Tool Invocations Visually */}
                            {(m.toolInvocations || []).map(toolInvocation => {
                                const toolCallId = toolInvocation.toolCallId || Math.random();
                                if (toolInvocation.state === 'result') {
                                    return (
                                        <div key={toolCallId} className="mt-2 p-2 bg-green-50 border border-green-200 text-green-700 text-xs rounded">
                                            ✅ Executed Autonomous Spatial Query
                                        </div>
                                    );
                                } else {
                                    return (
                                        <div key={toolCallId} className="mt-2 p-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs rounded flex gap-2 items-center">
                                            <div className="animate-spin h-3 w-3 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                                            Executing Spatial Query...
                                        </div>
                                    );
                                }
                            })}
                        </div>
                    ))}
                    {isLoading && (
                        <div className="message agent typing">
                            <div className="flex gap-1 text-xs text-slate-400">
                                <span>Agent is thinking...</span>
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>
                <div className="model-selector border-t px-2 pt-2">
                    <select
                        value={selectedModel}
                        onChange={(e) => onModelChange(e.target.value)}
                        className="w-full px-2 py-1 text-xs border rounded bg-slate-50 text-slate-700 focus:outline-none focus:border-blue-500"
                    >
                        <option value="openai/gpt-4o-mini">⚡ GPT-4o Mini (Fast & Cheap)</option>
                        <option value="anthropic/claude-3.5-sonnet">🧠 Claude 3.5 Sonnet (Best)</option>
                        <option value="google/gemini-2.5-flash">💎 Gemini 2.5 Flash (Free)</option>
                        <option value="anthropic/claude-3-opus">🏆 Claude 3 Opus (Premium)</option>
                    </select>
                </div>
                <form className="chat-input-area flex p-2" onSubmit={handleSubmit}>
                    <input
                        type="text"
                        className="chat-input flex-1 px-3 py-2 text-sm border rounded focus:outline-none focus:border-blue-500"
                        placeholder="Ask the AI to query the database... e.g. 'Show large public buildings'"
                        value={input}
                        onChange={handleInputChange}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="ml-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        {isLoading ? '...' : 'Send'}
                    </button>
                </form>
            </section>

            {/* SECTION B: Metrics & Charts */}
            <section className="dashboard-charts">
                <h3 className="section-title">Spatial Analytics</h3>

                {renderRadarChart()}

                <ErrorBoundary>
                    <div className="chart-card">
                        <h4>Building Typology</h4>
                        <div className="chart-wrapper">
                            <Doughnut data={doughnutData} options={chartOptions} />
                        </div>
                    </div>
                </ErrorBoundary>

                <ErrorBoundary>
                    <div className="chart-card">
                        <h4>Regional Distribution</h4>
                        <div className="chart-wrapper">
                            <Bar data={barData} options={barOptions} />
                        </div>
                    </div>
                </ErrorBoundary>
            </section>

            {/* SECTION C: Summary Stats */}
            <section className="dashboard-summary">
                {selectedFeature ? (
                    <div className="info-card">
                        <h4><span className="text-xl">📍</span> Selected Feature Details</h4>
                        <div className="info-grid mt-3">
                            <span className="label">ID:</span>
                            <span className="val">{selectedFeature?.id || 'N/A'}</span>
                            <span className="label">Type:</span>
                            <span className="val capitalize">{selectedFeature?.type || 'Unknown'}</span>
                            <span className="label">Area:</span>
                            <span className="val">{selectedFeature?.area ? `${selectedFeature.area} m²` : 'Data Unavailable'}</span>
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
                                {globalMetrics?.summary?.total_area && !isNaN(parseFloat(globalMetrics.summary.total_area))
                                    ? (parseFloat(globalMetrics.summary.total_area) / 1000000).toFixed(2)
                                    : '...'} km²
                            </div>
                        </div>
                    </div>
                )}
            </section>
        </aside>
    );
}
