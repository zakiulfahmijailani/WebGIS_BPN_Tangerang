import React, { useMemo } from 'react';

const TYPE_BADGES = {
    'residential': { color: 'bg-blue-100 text-blue-700', icon: '🏠' },
    'commercial': { color: 'bg-amber-100 text-amber-700', icon: '🏬' },
    'industrial': { color: 'bg-red-100 text-red-700', icon: '🏭' },
    'public': { color: 'bg-emerald-100 text-emerald-700', icon: '🏛️' },
    'mixed': { color: 'bg-violet-100 text-violet-700', icon: '🏗️' },
};

function getBadge(type) {
    if (!type) return { color: 'bg-slate-100 text-slate-600', icon: '❓' };
    const key = type.toLowerCase();
    for (const [k, v] of Object.entries(TYPE_BADGES)) {
        if (key.includes(k)) return v;
    }
    return { color: 'bg-slate-100 text-slate-600', icon: '🏢' };
}

export default function LiveFeed({ features, onItemClick }) {
    const feedItems = useMemo(() => {
        return [...features]
            .filter(f => parseFloat(f.properties?.area) > 0)
            .sort((a, b) => parseFloat(b.properties.area) - parseFloat(a.properties.area))
            .slice(0, 30)
            .map((f, i) => ({
                id: f.properties?.id || i,
                type: f.properties?.type || 'Unknown',
                area: parseFloat(f.properties?.area) || 0,
                props: f.properties,
            }));
    }, [features]);

    return (
        <div className="flex flex-col h-full overflow-hidden w-full">
            <div className="px-4 py-3 border-b border-slate-200/50 flex items-center justify-between bg-white/30 backdrop-blur-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Live Activity Feed
                </h3>
                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-semibold">
                    {feedItems.length} items
                </span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scroll divide-y divide-slate-200/30">
                {feedItems.map((item) => {
                    const badge = getBadge(item.type);
                    return (
                        <div
                            key={item.id}
                            className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors flex items-center gap-3"
                            onClick={() => onItemClick && onItemClick(item.props)}
                        >
                            <span className="text-base">{badge.icon}</span>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-slate-700 truncate">
                                        ID: {item.id}
                                    </span>
                                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${badge.color}`}>
                                        {item.type}
                                    </span>
                                </div>
                                <span className="text-[11px] text-slate-400">
                                    {item.area.toLocaleString()} m²
                                </span>
                            </div>
                            <span className="text-[10px] text-slate-300">→</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
