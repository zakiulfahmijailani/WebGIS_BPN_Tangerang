import React from 'react';

export default function ChatWidget() {
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 opacity-55 relative">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                💬 AI Assistant
            </h3>
            <span className="absolute top-2.5 right-3 text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-500 border border-amber-200">
                Coming Soon
            </span>
            <p className="text-[11px] text-slate-400 mt-1.5 mb-2 leading-relaxed">
                Ask spatial questions about buildings and land use.
            </p>
            <input
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-400 cursor-not-allowed"
                type="text" placeholder="Ask a spatial question..." disabled
            />
        </div>
    );
}
