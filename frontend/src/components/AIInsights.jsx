import React, { useState } from 'react';
import axios from 'axios';

export default function AIInsights({ features }) {
    const [insights, setInsights] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSummarize = async () => {
        setLoading(true);
        setInsights('');
        try {
            // Build summary data to send
            const typeCount = {};
            let totalArea = 0;
            features.slice(0, 200).forEach(f => {
                const type = f.properties?.type || 'Unknown';
                typeCount[type] = (typeCount[type] || 0) + 1;
                totalArea += parseFloat(f.properties?.area) || 0;
            });

            const summaryData = {
                totalBuildings: features.length,
                totalAreaM2: Math.round(totalArea),
                typeBreakdown: typeCount,
            };

            const res = await axios.post('/api/ai/insights', { data: summaryData });
            setInsights(res.data.text || 'No insights generated.');
        } catch (err) {
            console.error('AI Insights failed:', err);
            setInsights('Failed to generate insights. Make sure the backend is running and has a valid API key.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-3 w-full">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                    ✨ AI Command Insights
                </h3>
                <button
                    onClick={handleSummarize}
                    disabled={loading}
                    className="text-xs font-semibold px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm cursor-pointer"
                >
                    {loading ? 'Analyzing...' : 'Summarize Situation'}
                </button>
            </div>

            {loading && (
                <div className="space-y-2">
                    <div className="h-3 bg-indigo-200/50 rounded animate-pulse-slow" style={{ width: '90%' }} />
                    <div className="h-3 bg-indigo-200/50 rounded animate-pulse-slow" style={{ width: '75%' }} />
                    <div className="h-3 bg-indigo-200/50 rounded animate-pulse-slow" style={{ width: '60%' }} />
                </div>
            )}

            {insights && !loading && (
                <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-white/70 rounded-lg p-3 border border-indigo-100">
                    {insights}
                </div>
            )}

            {!insights && !loading && (
                <p className="text-xs text-indigo-300 italic">
                    Click "Summarize Situation" to get AI-powered analysis of the current filtered data.
                </p>
            )}
        </div>
    );
}
