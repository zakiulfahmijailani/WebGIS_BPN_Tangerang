"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "../../lib/supabaseClient";

export default function LeftSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    // Temporary mock data for chat history since we're refactoring UI
    // Later we'll tie this to the actual Supabase session history
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
        <div className="w-[240px] flex-shrink-0 h-full bg-[#0f172a] flex flex-col border-r border-slate-800 text-slate-300">

            {/* 1. Header & Logo */}
            <div className="px-5 py-6">
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30">
                        K
                    </div>
                    <div>
                        <h1 className="text-white font-bold text-base leading-tight tracking-tight">
                            WebGIS BPN
                        </h1>
                        <p className="text-[10px] text-blue-400 font-medium uppercase tracking-widest text-nowrap">
                            Spatial Intelligence
                        </p>
                    </div>
                </div>
            </div>

            {/* 2. Primary CTA */}
            <div className="px-4 mb-6">
                <button className="w-full bg-white hover:bg-slate-100 text-slate-900 font-semibold py-2.5 px-4 rounded-xl text-sm shadow-sm transition-all focus:ring-2 focus:ring-white/20 flexitems-center justify-center">
                    + Analyze
                </button>
            </div>

            {/* 3. Main Navigation */}
            <nav className="px-2 mb-6">
                <ul className="space-y-1">
                    <li>
                        <Link href="/" className="flex items-center gap-3 px-3 py-2 text-sm text-white bg-white/10 rounded-lg">
                            <span className="text-lg">📊</span> Data Catalogue
                        </Link>
                    </li>
                    <li>
                        <Link href="#" className="flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                            <span className="text-lg">👥</span> Layers
                        </Link>
                    </li>
                    <li>
                        <Link href="#" className="flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                            <span className="text-lg">ℹ️</span> About
                        </Link>
                    </li>
                </ul>
            </nav>

            {/* 4. Chat History Section (Scrollable) */}
            <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-4">
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
            <div className="p-2 border-t border-slate-800/60 mt-auto bg-[#0f172a]">
                <ul className="space-y-1">
                    <li>
                        <button className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                            <span className="text-lg">⚙️</span> Settings
                        </button>
                    </li>
                    <li>
                        <button className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                            <span className="text-lg">❓</span> Help
                        </button>
                    </li>
                    <li>
                        <button
                            onClick={handleLogout}
                            className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                            <span className="text-lg">🔓</span> Log Out
                        </button>
                    </li>
                </ul>
            </div>

        </div>
    );
}
