"use client";

import { useState } from "react";
import ChatPanel from "./ChatPanel";
import AnalyticsPanel from "./AnalyticsPanel";
import { FlyToCommand } from "./MapLibreMap";
import { Eye, EyeOff } from "lucide-react";

interface RightPanelProps {
    sessionId: string;
    selectedModel: string;
    onModelChange: (model: string) => void;
    onChatResponse: (response: any) => void;
    onMapCommand: (cmd: FlyToCommand) => void;
    aiLayer: {
        geojson: GeoJSON.FeatureCollection | null;
        style: any;
        layerType: string;
        visible: boolean;
    };
    geojsonData: GeoJSON.FeatureCollection | null;
    buildingsData: GeoJSON.FeatureCollection | null;
    activeQuery: string;
    // Layer toggles specifically for RightPanel Layers tab
    showCity: boolean;
    setShowCity: (v: boolean) => void;
    showBuildings: boolean;
    setShowBuildings: (v: boolean) => void;
    showKecamatan: boolean;
    setShowKecamatan: (v: boolean) => void;
    showKelurahan: boolean;
    setShowKelurahan: (v: boolean) => void;
}

const TABS = ["Metrics", "Layers", "Legend"];

export default function RightPanel({
    sessionId,
    selectedModel,
    onModelChange,
    onChatResponse,
    onMapCommand,
    aiLayer,
    geojsonData,
    buildingsData,
    activeQuery,
    showCity, setShowCity,
    showBuildings, setShowBuildings,
    showKecamatan, setShowKecamatan,
    showKelurahan, setShowKelurahan,
}: RightPanelProps) {
    const [activeTab, setActiveTab] = useState("Metrics");

    return (
        <div className="w-[360px] flex-shrink-0 h-full bg-[#f8fafc] flex flex-col border-l border-slate-200 relative z-10">

            {/* TOP SECTION: Chatbot (35% height) */}
            <div className="h-[35%] min-h-[250px] border-b border-slate-200 bg-white/78 backdrop-blur-xl relative flex flex-col">
                {/* We will embed the ChatPanel here soon */}
                <div className="p-4 flex items-center justify-between border-b border-white/50 bg-white/40">
                    <h2 className="font-semibold text-slate-800 tracking-tight flex items-center gap-2">
                        <span className="text-xl">🤖</span> Kue Assistant
                    </h2>
                    {/* Model Selector Placeholder */}
                    <div className="text-xs text-slate-500 glass px-2 py-1">
                        Gemini 2.5
                    </div>
                </div>
                <div className="flex-1 overflow-hidden relative">
                    <ChatPanel
                        sessionId={sessionId}
                        selectedModel={selectedModel}
                        onModelChange={onModelChange}
                        onChatResponse={onChatResponse}
                        onMapCommand={onMapCommand}
                    />
                </div>
            </div>

            {/* MIDDLE SECTION: Toggle Bar */}
            <div className="px-4 py-3 bg-white/40 backdrop-blur-md border-b border-slate-200">
                <div className="flex p-1 bg-slate-100/80 rounded-xl">
                    {TABS.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 text-sm py-1.5 rounded-lg transition-all ${activeTab === tab
                                ? "bg-white shadow-sm text-slate-900 font-medium"
                                : "text-slate-500 hover:text-slate-700 font-medium"
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* BOTTOM SECTION: Content area for active tab (Scrollable) */}
            <div className="flex-1 overflow-y-auto scrollbar-thin p-4 bg-gradient-to-b from-white/40 to-[#f8fafc]">

                {activeTab === "Metrics" && (
                    <div className="h-full relative -mx-4 -my-4">
                        <AnalyticsPanel
                            geojsonData={geojsonData}
                            buildingsData={buildingsData}
                            activeQuery={activeQuery}
                        />
                    </div>
                )}

                {activeTab === "Layers" && (
                    <div className="space-y-3">
                        <div className="glass p-4">
                            <h3 className="font-semibold text-slate-800 text-sm mb-4">Map Layers</h3>
                            <div className="space-y-2">
                                <LayerToggle label="City Boundary" active={showCity} color="#3b82f6" onToggle={() => setShowCity(!showCity)} />
                                <LayerToggle label="Buildings" active={showBuildings} color="#4ade80" onToggle={() => setShowBuildings(!showBuildings)} />
                                <LayerToggle label="Kecamatan" active={showKecamatan} color="#f472b6" onToggle={() => setShowKecamatan(!showKecamatan)} />
                                <LayerToggle label="Kelurahan" active={showKelurahan} color="#c084fc" onToggle={() => setShowKelurahan(!showKelurahan)} />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "Legend" && (
                    <div className="space-y-3">
                        <div className="glass p-4">
                            <h3 className="font-semibold text-slate-800 text-sm mb-4">Current AI Layer</h3>
                            {aiLayer.style ? (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-600 font-medium capitalize">
                                            {aiLayer.style.type || 'Unknown'} Type
                                        </span>
                                    </div>
                                    <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-200">
                                        {Object.entries(aiLayer.style.paint || {}).map(([key, value]) => (
                                            <div key={key} className="flex items-center justify-between py-1 text-xs">
                                                <span className="text-slate-500 font-mono">{key}</span>
                                                <div className="flex items-center gap-2">
                                                    {typeof value === 'string' && (value.startsWith('#') || value.startsWith('rgb')) && (
                                                        <div className="w-4 h-4 rounded shadow-sm border border-slate-300" style={{ backgroundColor: value }} />
                                                    )}
                                                    <span className="text-slate-800 font-medium">
                                                        {typeof value === 'object' ? 'Dynamic' : String(value)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-xs text-slate-500 text-center py-6">No active AI style applied</p>
                            )}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}

// ─── Layer Toggle Sub-component inside RightPanel ───
function LayerToggle({
    label,
    active,
    color,
    onToggle,
}: {
    label: string;
    active: boolean;
    color: string;
    onToggle: () => void;
}) {
    return (
        <button
            onClick={onToggle}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg
                 hover:bg-slate-100 transition-all group border border-transparent hover:border-slate-200"
        >
            <div
                className="w-4 h-4 rounded-sm border-2 transition-all"
                style={{
                    backgroundColor: active ? color : 'transparent',
                    borderColor: color,
                }}
            />
            <span className="text-sm text-slate-700 font-medium flex-1 text-left">{label}</span>
            {active ? (
                <Eye className="w-4 h-4 text-slate-500" />
            ) : (
                <EyeOff className="w-4 h-4 text-slate-400" />
            )}
        </button>
    );
}
