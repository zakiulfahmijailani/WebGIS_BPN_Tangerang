import React from 'react';

const DashboardSidebar = ({ geoData, loading, error }) => {
    const buildingCount = geoData?.features?.length || 0;

    return (
        <div className="w-[300px] h-full bg-slate-900 text-white p-6 shadow-2xl z-[1000] flex flex-col border-r border-slate-800">
            <div className="mb-10">
                <h1 className="text-xl font-extrabold tracking-tight text-white mb-1">
                    TANGERANG <span className="text-emerald-500">GIS</span>
                </h1>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">Building Footprints</p>
            </div>

            <div className="flex-1 space-y-8">
                <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 block">Data Status</label>
                    {loading ? (
                        <div className="flex items-center space-x-3 text-slate-400">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
                            <span className="text-sm font-medium">Fetching layers...</span>
                        </div>
                    ) : error ? (
                        <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                            <p className="text-xs text-red-400 leading-relaxed font-medium">{error}</p>
                        </div>
                    ) : (
                        <div className="flex items-center space-x-3 text-emerald-400">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                            <span className="text-sm font-medium">System Online</span>
                        </div>
                    )}
                </div>

                <div className="bg-slate-800/40 border border-slate-700/50 p-5 rounded-xl backdrop-blur-sm">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 block">Metrics</label>
                    <div className="flex flex-col">
                        <span className="text-3xl font-bold text-white mb-1">
                            {loading ? '---' : buildingCount.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">Buildings Loaded</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Project Info</label>
                    <p className="text-xs text-slate-400 leading-relaxed">
                        This application visualizes building geometries in Tangerang City.
                        Data is streamed directly from a <span className="text-slate-300 font-semibold">PostgreSQL/PostGIS</span> database via a <span className="text-slate-300 font-semibold">Node.js</span> backend.
                    </p>
                </div>
            </div>

            <div className="mt-auto pt-6 border-t border-slate-800">
                <div className="flex items-center justify-between text-[10px] text-slate-600 font-bold uppercase tracking-tighter">
                    <span>Leaflet + Supabase</span>
                    <span>v1.0-STABLE</span>
                </div>
            </div>
        </div>
    );
};

export default DashboardSidebar;
