"use client";

import { useState } from "react";
import { X, Settings, Sun, Moon, Globe, MapPin } from "lucide-react";

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const [darkMode, setDarkMode] = useState(true);
    const [defaultZoom, setDefaultZoom] = useState(12);
    const [language, setLanguage] = useState("id");
    const [mapCenter, setMapCenter] = useState("Tangerang");

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="w-[460px] max-h-[75vh] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/60 flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center shadow-md">
                            <Settings className="w-4 h-4 text-white" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-800">Settings</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-all text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

                    {/* Display */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                            <Sun className="w-4 h-4 text-amber-500" /> Display
                        </h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[14px] text-slate-600">Dark Mode</span>
                                <button
                                    onClick={() => setDarkMode(!darkMode)}
                                    className={`w-11 h-6 rounded-full relative transition-all ${darkMode ? 'bg-blue-500' : 'bg-slate-300'}`}
                                >
                                    <div className={`w-5 h-5 bg-white rounded-full shadow-md absolute top-0.5 transition-all ${darkMode ? 'left-5.5' : 'left-0.5'}`} />
                                </button>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[14px] text-slate-600">Language</span>
                                <select
                                    value={language}
                                    onChange={e => setLanguage(e.target.value)}
                                    className="text-[13px] px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 outline-none"
                                >
                                    <option value="id">Bahasa Indonesia</option>
                                    <option value="en">English</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Map Defaults */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-blue-500" /> Map Defaults
                        </h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[14px] text-slate-600">Default Zoom</span>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="range"
                                        min="8" max="18"
                                        value={defaultZoom}
                                        onChange={e => setDefaultZoom(Number(e.target.value))}
                                        className="w-24 h-1.5 bg-slate-200 rounded-full appearance-none accent-blue-500"
                                    />
                                    <span className="text-[13px] text-slate-500 w-6 text-right">{defaultZoom}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[14px] text-slate-600">Map Center</span>
                                <select
                                    value={mapCenter}
                                    onChange={e => setMapCenter(e.target.value)}
                                    className="text-[13px] px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 outline-none"
                                >
                                    <option value="Tangerang">Kota Tangerang</option>
                                    <option value="Cipondoh">Cipondoh</option>
                                    <option value="Karawaci">Karawaci</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* About */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                            <Globe className="w-4 h-4 text-cyan-500" /> About
                        </h3>
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                            <p className="text-[14px] font-bold text-slate-700">GeoSpatial.ID</p>
                            <p className="text-[12px] text-slate-500 mt-1">AI-Powered Cadastral Dashboard</p>
                            <p className="text-[12px] text-slate-500 mt-0.5">Version 1.0.0 · Built with Next.js + MapLibre</p>
                            <p className="text-[12px] text-slate-400 mt-2">© 2026 BPN Kota Tangerang</p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-slate-100 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-all">
                        Cancel
                    </button>
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all">
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
