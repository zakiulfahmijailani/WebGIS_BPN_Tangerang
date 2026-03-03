"use client";

import { useState } from "react";
import ChatPanel from "./ChatPanel";
import AnalyticsPanel from "./AnalyticsPanel";
import { FlyToCommand } from "./MapLibreMap";
import { PanelRightClose, PanelRight, MessageSquare, BarChart3 } from "lucide-react";

interface RightPanelProps {
    isCollapsed: boolean;
    onToggle: () => void;
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
    showCity: boolean;
    setShowCity: (v: boolean) => void;
    showBuildings: boolean;
    setShowBuildings: (v: boolean) => void;
    showKecamatan: boolean;
    setShowKecamatan: (v: boolean) => void;
    showKelurahan: boolean;
    setShowKelurahan: (v: boolean) => void;
}

export default function RightPanel({
    isCollapsed,
    onToggle,
    sessionId,
    selectedModel,
    onModelChange,
    onChatResponse,
    onMapCommand,
    aiLayer,
    geojsonData,
    buildingsData,
    activeQuery,
}: RightPanelProps) {
    return (
        <div className={`flex-shrink-0 h-full flex flex-col border-l border-white/15 relative z-10 transition-all duration-300 ${isCollapsed ? 'w-[64px]' : 'w-[360px]'}`}
            style={{
                background: 'rgba(255, 255, 255, 0.45)',
                backdropFilter: 'blur(24px) saturate(180%)',
                WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            }}
        >
            {/* 1. Header (Always Visible) */}
            <div className={`flex-none border-b border-white/20 transition-all duration-300 ${isCollapsed ? 'py-6' : 'p-4'}`}
                style={{ background: 'rgba(255, 255, 255, 0.4)' }}
            >
                <div className={`flex items-center justify-between w-full ${isCollapsed ? 'flex-col-reverse gap-3' : 'flex-row'}`}>
                    <div className={`flex items-center gap-2 ${isCollapsed ? 'flex-col-reverse' : ''}`}>
                        {/* Toggle Button */}
                        <button
                            onClick={onToggle}
                            className="p-2 bg-white/40 hover:bg-white/60 border border-white/40 rounded-lg transition-all text-slate-700 hover:text-slate-900 shadow-sm backdrop-blur-md"
                            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                        >
                            {isCollapsed ? <PanelRight className="w-5 h-5" /> : <PanelRightClose className="w-5 h-5" />}
                        </button>

                        {/* 1b. Identity (Always on the OUTER side expanded, moves to TOP collapsed) */}
                        {!isCollapsed ? (
                            <h2 className="font-semibold text-slate-800 tracking-tight flex items-center gap-2 ml-2">
                                <span className="text-xl">🤖</span> ChatbotGIS
                            </h2>
                        ) : (
                            <span className="text-2xl mt-1" title="ChatbotGIS">🤖</span>
                        )}
                    </div>

                    {!isCollapsed && (
                        <div className="text-xs text-slate-600 bg-white/40 backdrop-blur-sm border border-white/40 px-2 py-1 rounded-lg">
                            Gemini 2.5
                        </div>
                    )}
                </div>
            </div>

            {/* 2. CHAT SECTION (35% Height, hidden when collapsed) */}
            {!isCollapsed && (
                <div className="h-[35%] min-h-[250px] border-b border-white/20 relative flex flex-col overflow-hidden"
                    style={{ background: 'rgba(255, 255, 255, 0.25)' }}
                >
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
            )}

            {/* 3. LOWER SECTION: Metrics & Rail Icons */}
            <div className={`flex-1 flex flex-col overflow-hidden ${isCollapsed ? 'items-center gap-8 py-8' : ''}`}>
                {isCollapsed ? (
                    <>
                        <MessageSquare className="w-6 h-6 opacity-30 mt-4" />
                        <BarChart3 className="w-6 h-6 opacity-30" />
                    </>
                ) : (
                    <>
                        {/* Analytics Header */}
                        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between flex-none"
                            style={{ background: 'rgba(255, 255, 255, 0.1)' }}
                        >
                            <h3 className="text-sm font-semibold text-slate-800 tracking-tight flex items-center gap-2">
                                <span className="text-blue-500">📊</span> Metrics & Insights
                            </h3>
                        </div>

                        {/* Scrollable Analytics Content */}
                        <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
                            <div className="h-full relative -mx-4 -my-4">
                                <AnalyticsPanel
                                    geojsonData={geojsonData}
                                    buildingsData={buildingsData}
                                    activeQuery={activeQuery}
                                />
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
