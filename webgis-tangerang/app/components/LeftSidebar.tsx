"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "../../lib/supabaseClient";
import { PanelLeftClose, PanelLeft, LayoutDashboard, Layers, Info, Settings, HelpCircle, LogOut, Navigation } from "lucide-react";

interface LeftSidebarProps {
    isCollapsed: boolean;
    onToggle: () => void;
}

export default function LeftSidebar({ isCollapsed, onToggle }: LeftSidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    const historyToday = [
        "Show all buildings",
        "Show boundary of kota tangerang",
        "Commercial area in Ciledug",
    ];

    const historyYesterday = [
        "Public buildings nearby",
        "Kecamatan Batuceper",
    ];

    return (
        <div className={`flex-shrink-0 h-full glass-dark flex flex-col text-slate-300 border-r border-white/10 transition-all duration-300 relative ${isCollapsed ? 'w-[64px]' : 'w-[240px]'}`}>

            {/* 1. Header & Logo */}
            <div className={`px-5 py-6 flex ${isCollapsed ? 'flex-col items-center gap-2' : 'items-center justify-between'}`}>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex-shrink-0 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30">
                        <Navigation className="w-5 h-5" />
                    </div>
                    {!isCollapsed && (
                        <div>
                            <h1 className="text-white font-bold text-base leading-tight tracking-tight">
                                WebGIS BPN
                            </h1>
                            <p className="text-[10px] text-blue-400 font-medium uppercase tracking-widest text-nowrap">
                                Spatial Intelligence
                            </p>
                        </div>
                    )}
                </div>

                {/* Toggle Button */}
                <button
                    onClick={onToggle}
                    className={`p-2 bg-slate-900/40 hover:bg-slate-900/60 border border-white/10 rounded-lg transition-all text-white/70 hover:text-white shadow-xl ${isCollapsed ? 'mt-1' : ''}`}
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    {isCollapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
                </button>
            </div>

            {/* 2. Primary CTA */}
            <div className={`px-4 mb-6 ${isCollapsed ? 'px-2' : ''}`}>
                <button
                    className={`w-full bg-white/10 hover:bg-white/15 text-white font-semibold rounded-xl text-sm shadow-sm transition-all border border-white/10 flex items-center justify-center gap-2 ${isCollapsed ? 'h-10 px-0' : 'py-2.5 px-4'}`}
                    title={isCollapsed ? "Analyze" : undefined}
                >
                    {isCollapsed ? <span className="text-lg">+</span> : "+ Analyze"}
                </button>
            </div>

            {/* 3. Main Navigation */}
            <nav className={`px-2 mb-6 ${isCollapsed ? 'px-1.5' : ''}`}>
                <ul className="space-y-1">
                    <li>
                        <Link
                            href="/"
                            className={`flex items-center gap-3 px-3 py-2 text-sm text-white bg-white/10 rounded-lg transition-all ${isCollapsed ? 'justify-center px-0' : ''}`}
                            title={isCollapsed ? "Data Catalogue" : undefined}
                        >
                            <LayoutDashboard className="w-5 h-5" />
                            {!isCollapsed && <span>Data Catalogue</span>}
                        </Link>
                    </li>
                    <li>
                        <Link
                            href="#"
                            className={`flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all ${isCollapsed ? 'justify-center px-0' : ''}`}
                            title={isCollapsed ? "Layers" : undefined}
                        >
                            <Layers className="w-5 h-5" />
                            {!isCollapsed && <span>Layers</span>}
                        </Link>
                    </li>
                    <li>
                        <Link
                            href="#"
                            className={`flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all ${isCollapsed ? 'justify-center px-0' : ''}`}
                            title={isCollapsed ? "About" : undefined}
                        >
                            <Info className="w-5 h-5" />
                            {!isCollapsed && <span>About</span>}
                        </Link>
                    </li>
                </ul>
            </nav>

            {/* 4. Chat History Section (Scrollable) */}
            <div className={`flex-1 overflow-y-auto scrollbar-thin px-2 pb-4 ${isCollapsed ? 'hidden' : ''}`}>
                <div className="mb-6">
                    <h3 className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Today</h3>
                    <ul className="space-y-0.5">
                        {historyToday.map((item, idx) => (
                            <li key={idx}>
                                <button className="w-full text-left px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-lg truncate transition-colors">
                                    {item}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>

                <div>
                    <h3 className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Yesterday</h3>
                    <ul className="space-y-0.5">
                        {historyYesterday.map((item, idx) => (
                            <li key={idx}>
                                <button className="w-full text-left px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-lg truncate transition-colors">
                                    {item}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* 5. Footer Navigation pinned to bottom */}
            <div className={`p-2 border-t border-white/10 mt-auto ${isCollapsed ? 'px-1.5' : ''}`}>
                <ul className="space-y-1">
                    <li>
                        <button
                            className={`w-full text-left flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all ${isCollapsed ? 'justify-center px-0' : ''}`}
                            title={isCollapsed ? "Settings" : undefined}
                        >
                            <Settings className="w-5 h-5" />
                            {!isCollapsed && <span>Settings</span>}
                        </button>
                    </li>
                    <li>
                        <button
                            className={`w-full text-left flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all ${isCollapsed ? 'justify-center px-0' : ''}`}
                            title={isCollapsed ? "Help" : undefined}
                        >
                            <HelpCircle className="w-5 h-5" />
                            {!isCollapsed && <span>Help</span>}
                        </button>
                    </li>
                    <li>
                        <button
                            onClick={handleLogout}
                            className={`w-full text-left flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all ${isCollapsed ? 'justify-center px-0' : ''}`}
                            title={isCollapsed ? "Log Out" : undefined}
                        >
                            <LogOut className="w-5 h-5" />
                            {!isCollapsed && <span>Log Out</span>}
                        </button>
                    </li>
                </ul>
            </div>

        </div>
    );
}
