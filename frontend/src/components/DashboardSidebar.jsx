import React, { useState, useEffect, useRef } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
    LayoutDashboard, MessageSquare, Send, Building, Maximize2, Activity
} from 'lucide-react';
import { getMetrics, postChat } from '../api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function DashboardSidebar() {
    const [activeTab, setActiveTab] = useState('metrics');
    const [metrics, setMetrics] = useState(null);
    const [messages, setMessages] = useState([
        { role: 'ai', text: 'Hello! I am your Tangerang WebGIS Assistant. How can I help you today?' }
    ]);
    const [inputMessage, setInputMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const chatEndRef = useRef(null);

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    // Load metrics data
    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                const data = await getMetrics();
                setMetrics(data);
            } catch (err) {
                console.error('Failed to load metrics:', err);
            }
        };
        fetchMetrics();
    }, []);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputMessage.trim()) return;

        const userMsg = inputMessage;
        setInputMessage('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsTyping(true);

        try {
            const data = await postChat(userMsg);
            setMessages(prev => [...prev, { role: 'ai', text: data.response }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'ai', text: 'Error connecting to chatbot server.' }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="sidebar">
            {/* Tab Navigation */}
            <div className="sidebar-header">
                <button
                    className={`tab-btn ${activeTab === 'metrics' ? 'active' : ''}`}
                    onClick={() => setActiveTab('metrics')}
                >
                    <LayoutDashboard size={18} />
                    <span>Metrics</span>
                </button>
                <button
                    className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
                    onClick={() => setActiveTab('chat')}
                >
                    <MessageSquare size={18} />
                    <span>AI Chat</span>
                </button>
            </div>

            <div className="sidebar-content">
                {activeTab === 'metrics' ? (
                    <div className="metrics-section">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Activity size={20} className="text-blue-500" />
                            Spatial Insights
                        </h2>

                        <div className="metric-card">
                            <h3>Total Buildings</h3>
                            <div className="flex items-center gap-3">
                                <Building className="text-blue-500" size={24} />
                                <span className="metric-value">{metrics?.summary?.total_buildings || '...'}</span>
                            </div>
                        </div>

                        <div className="metric-card">
                            <h3>Total Footprint Area</h3>
                            <div className="flex items-center gap-3">
                                <Maximize2 className="text-green-500" size={24} />
                                <span className="metric-value">
                                    {metrics?.summary?.total_area ? (metrics.summary.total_area / 1000000).toFixed(2) : '...'} km²
                                </span>
                            </div>
                        </div>

                        <div className="mt-8">
                            <h4 className="text-sm font-semibold text-slate-500 mb-4 uppercase tracking-wider">
                                Building Distribution
                            </h4>
                            <div className="chart-container">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={metrics?.distribution || []} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                                        <XAxis type="number" hide />
                                        <YAxis
                                            dataKey="type"
                                            type="category"
                                            width={80}
                                            fontSize={11}
                                            tick={{ fill: '#64748b' }}
                                        />
                                        <Tooltip
                                            cursor={{ fill: '#f1f5f9' }}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        />
                                        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                            {metrics?.distribution?.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="chat-container">
                        <div className="chat-history">
                            {messages.map((msg, i) => (
                                <div key={i} className={`message ${msg.role}`}>
                                    {msg.text}
                                </div>
                            ))}
                            {isTyping && (
                                <div className="message ai typing">
                                    <div className="flex gap-1">
                                        <span className="animate-bounce">.</span>
                                        <span className="animate-bounce delay-75">.</span>
                                        <span className="animate-bounce delay-150">.</span>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        <form className="chat-input-area" onSubmit={handleSendMessage}>
                            <input
                                className="chat-input"
                                placeholder="Ask about building data..."
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                            />
                            <button type="submit" className="send-btn">
                                <Send size={18} />
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
