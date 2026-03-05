"use client";

import { X, HelpCircle, Keyboard, MessageSquare, Mail } from "lucide-react";

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SHORTCUTS = [
    { keys: ["Ctrl", "+"], desc: "Zoom In" },
    { keys: ["Ctrl", "−"], desc: "Zoom Out" },
    { keys: ["Ctrl", "B"], desc: "Toggle Left Sidebar" },
    { keys: ["Ctrl", "J"], desc: "Toggle Right Panel" },
    { keys: ["Esc"], desc: "Close Modal" },
    { keys: ["Enter"], desc: "Send Chat Message" },
];

const FAQ = [
    { q: "Bagaimana cara upload data GeoJSON?", a: "Klik 'Data Catalogue' di sidebar, lalu klik tombol 'Upload GeoJSON' di pojok kanan atas popup." },
    { q: "Bagaimana cara bertanya ke AI?", a: "Gunakan ChatbotGIS di panel kanan. Ketik pertanyaan dalam bahasa alami seperti 'Tampilkan semua bangunan di Cipondoh'." },
    { q: "Bagaimana cara mengubah visibilitas layer?", a: "Gunakan panel Layers di atas peta (floating panel). Klik ikon mata untuk toggle visibilitas." },
];

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="w-[500px] max-h-[80vh] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/60 flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
                            <HelpCircle className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Help & Shortcuts</h2>
                            <p className="text-[12px] text-slate-500">Learn how to use GeoSpatial.ID</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-all text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

                    {/* Keyboard Shortcuts */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                            <Keyboard className="w-4 h-4 text-indigo-500" /> Keyboard Shortcuts
                        </h3>
                        <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                            {SHORTCUTS.map((s, i) => (
                                <div key={i} className={`flex items-center justify-between px-4 py-2.5 ${i > 0 ? 'border-t border-slate-100' : ''}`}>
                                    <span className="text-[13px] text-slate-600">{s.desc}</span>
                                    <div className="flex items-center gap-1">
                                        {s.keys.map((k, ki) => (
                                            <kbd key={ki} className="px-2 py-0.5 text-[11px] font-mono bg-white border border-slate-200 rounded text-slate-600 shadow-sm">
                                                {k}
                                            </kbd>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* FAQ */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-blue-500" /> Frequently Asked Questions
                        </h3>
                        <div className="space-y-2.5">
                            {FAQ.map((item, i) => (
                                <div key={i} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                    <p className="text-[13px] font-semibold text-slate-700">{item.q}</p>
                                    <p className="text-[12px] text-slate-500 mt-1.5 leading-relaxed">{item.a}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Contact */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                            <Mail className="w-4 h-4 text-rose-500" /> Contact & Feedback
                        </h3>
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                            <p className="text-[13px] text-slate-600">Untuk laporan bug atau saran fitur, hubungi:</p>
                            <p className="text-[13px] text-blue-600 font-semibold mt-2">support@geospatial.id</p>
                            <p className="text-[12px] text-slate-400 mt-1">BPN Kota Tangerang · Divisi Teknologi Informasi</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
