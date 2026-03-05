"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabaseClient";
import {
    PanelLeftClose, PanelLeft,
    Plus, ChevronDown,
    Settings, HelpCircle, LogOut,
    Crosshair, Mountain, Car,
    Database, Globe,
} from "lucide-react";
import DataCatalogueModal from "./DataCatalogueModal";
import SettingsModal from "./SettingsModal";
import HelpModal from "./HelpModal";

/* ─── Types ─── */
interface LeftSidebarProps {
    isCollapsed: boolean;
    onToggle: () => void;
    showBuildings: boolean;
    setShowBuildings: (v: boolean) => void;
    showCity: boolean;
    setShowCity: (v: boolean) => void;
    showKecamatan: boolean;
    setShowKecamatan: (v: boolean) => void;
    showKelurahan: boolean;
    setShowKelurahan: (v: boolean) => void;
}

/* ─── Static Data ─── */
const ANALYZE_TOOLS = [
    { icon: Crosshair, label: "Buffer Analysis", desc: "Radius proximity search" },
    { icon: Mountain, label: "Viewshed", desc: "Line of sight analysis" },
    { icon: Car, label: "Drive-time Areas", desc: "Isochrone generation" },
];

/* ─── Component ─── */
export default function LeftSidebar({
    isCollapsed, onToggle,
}: LeftSidebarProps) {
    const router = useRouter();
    const supabase = createClient();

    const [analyzeOpen, setAnalyzeOpen] = useState(false);
    const [dataCatalogueOpen, setDataCatalogueOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [helpOpen, setHelpOpen] = useState(false);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        document.cookie = "webgis_bypass_auth=; path=/; max-age=0";
        window.location.href = "/login";
    };

    /* ─── COLLAPSED VIEW ─── */
    if (isCollapsed) {
        return (
            <div className="flex-shrink-0 w-[64px] h-full glass-dark-deep flex flex-col items-center text-slate-400 py-5 gap-1.5">
                {/* Logo */}
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 via-green-500 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 mb-1 relative overflow-hidden">
                    <Globe className="w-5 h-5 relative z-10" />
                    <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/10 rounded-xl" />
                </div>

                <button onClick={onToggle} className="p-2.5 hover:bg-white/5 rounded-lg transition-all mb-4" title="Expand Sidebar">
                    <PanelLeft className="w-5 h-5" />
                </button>

                <button onClick={() => setAnalyzeOpen(!analyzeOpen)} className="p-2.5 hover:bg-white/5 rounded-lg transition-all" title="Analyze">
                    <Plus className="w-5 h-5" />
                </button>
                <button onClick={() => setDataCatalogueOpen(true)} className="p-2.5 hover:bg-white/5 rounded-lg transition-all" title="Data Catalogue">
                    <Database className="w-5 h-5" />
                </button>

                {/* Footer */}
                <div className="mt-auto flex flex-col items-center gap-1.5 pt-3 border-t border-white/5 w-full">
                    <button onClick={() => setSettingsOpen(true)} className="p-2.5 hover:bg-white/5 rounded-lg transition-all" title="Settings"><Settings className="w-5 h-5" /></button>
                    <button onClick={() => setHelpOpen(true)} className="p-2.5 hover:bg-white/5 rounded-lg transition-all" title="Help"><HelpCircle className="w-5 h-5" /></button>
                    <button onClick={handleLogout} className="p-2.5 hover:bg-red-500/10 text-red-400 rounded-lg transition-all" title="Log Out"><LogOut className="w-5 h-5" /></button>
                </div>

                {/* Modals */}
                <DataCatalogueModal isOpen={dataCatalogueOpen} onClose={() => setDataCatalogueOpen(false)} />
                <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
                <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
            </div>
        );
    }

    /* ─── EXPANDED VIEW ─── */
    return (
        <div className="flex-shrink-0 w-[300px] h-full glass-dark-deep flex flex-col text-slate-300 transition-all duration-300">

            {/* ── 1. HEADER ── */}
            <div className="px-5 py-5 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 via-green-500 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 relative overflow-hidden">
                        <Globe className="w-5 h-5 relative z-10" />
                        <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/10 rounded-xl" />
                    </div>
                    <div>
                        <h1 className="text-white font-extrabold text-[17px] leading-tight tracking-tight">
                            GeoSpatial<span className="text-emerald-400">.ID</span>
                        </h1>
                        <p className="text-[11px] text-emerald-400/60 font-semibold uppercase tracking-[0.18em]">
                            Spatial Intelligence
                        </p>
                    </div>
                </div>
                <button onClick={onToggle} className="p-2 hover:bg-white/5 rounded-lg transition-all text-slate-500 hover:text-white" title="Collapse Sidebar">
                    <PanelLeftClose className="w-5 h-5" />
                </button>
            </div>

            {/* ── SCROLLABLE BODY ── */}
            <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-5 space-y-5">

                {/* ── 2. ANALYZE BUTTON ── */}
                <div>
                    <button
                        onClick={() => setAnalyzeOpen(!analyzeOpen)}
                        className="w-full bg-gradient-to-r from-emerald-500/20 to-green-600/20 hover:from-emerald-500/30 hover:to-green-600/30 text-emerald-300 font-bold rounded-xl text-[15px] py-3 px-5 border border-emerald-500/20 hover:border-emerald-500/30 transition-all flex items-center justify-between shadow-lg shadow-emerald-500/5"
                    >
                        <span className="flex items-center gap-2.5">
                            <Plus className="w-5 h-5" /> Analyze
                        </span>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${analyzeOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <div className={`overflow-hidden transition-all duration-300 ${analyzeOpen ? 'max-h-[250px] mt-3' : 'max-h-0'}`}>
                        <div className="space-y-1">
                            {ANALYZE_TOOLS.map(tool => (
                                <button
                                    key={tool.label}
                                    disabled
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-500 rounded-xl transition-all opacity-50 cursor-not-allowed"
                                >
                                    <tool.icon className="w-5 h-5 text-emerald-600/40 flex-shrink-0" />
                                    <div className="text-left">
                                        <p className="text-[14px] font-medium">{tool.label}</p>
                                        <p className="text-[11px] text-slate-600">{tool.desc}</p>
                                    </div>
                                    <span className="ml-auto text-[9px] bg-white/5 text-slate-600 px-2 py-0.5 rounded-full border border-white/5">Soon</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── 3. DATA CATALOGUE BUTTON ── */}
                <div>
                    <button
                        onClick={() => setDataCatalogueOpen(true)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-[15px] font-semibold text-slate-300 hover:text-white bg-white/[0.03] hover:bg-white/[0.06] rounded-xl border border-white/5 hover:border-white/10 transition-all group"
                    >
                        <Database className="w-5 h-5 text-emerald-500/60 group-hover:text-emerald-400" />
                        <span>Data Catalogue</span>
                        <span className="ml-auto text-[11px] text-slate-600 group-hover:text-slate-400">Browse →</span>
                    </button>
                </div>
            </div>

            {/* ── 4. SYSTEM UTILITIES (Footer) ── */}
            <div className="px-4 pb-4 pt-3 border-t border-white/5 space-y-1">
                <button
                    onClick={() => setSettingsOpen(true)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-[14px] text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                >
                    <Settings className="w-5 h-5" /> Settings
                </button>
                <button
                    onClick={() => setHelpOpen(true)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-[14px] text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                >
                    <HelpCircle className="w-5 h-5" /> Help & Shortcuts
                </button>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-[14px] text-red-400/70 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all"
                >
                    <LogOut className="w-5 h-5" /> Log Out
                </button>
            </div>

            {/* ── MODALS ── */}
            <DataCatalogueModal isOpen={dataCatalogueOpen} onClose={() => setDataCatalogueOpen(false)} />
            <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
            <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
        </div>
    );
}
