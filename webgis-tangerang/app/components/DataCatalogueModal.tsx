"use client";

import { useState, useEffect, useRef } from "react";
import { X, Upload, Database, Search, MapPin, Loader2, Trash2 } from "lucide-react";
import { createClient } from "../../lib/supabaseClient";

interface DataCatalogueModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface DatasetItem {
    name: string;
    featureCount: number;
    type: "system" | "uploaded";
}

export default function DataCatalogueModal({ isOpen, onClose }: DataCatalogueModalProps) {
    const [datasets, setDatasets] = useState<DatasetItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load datasets from Supabase
    useEffect(() => {
        if (!isOpen) return;
        loadDatasets();
    }, [isOpen]);

    const loadDatasets = async () => {
        setLoading(true);
        try {
            const supabase = createClient();
            const items: DatasetItem[] = [];

            // 1. System dataset: tangerang_buildings
            const { count: buildingCount } = await supabase
                .from("tangerang_buildings")
                .select("*", { count: "exact", head: true });
            if (buildingCount !== null) {
                items.push({ name: "Tangerang Buildings", featureCount: buildingCount, type: "system" });
            }

            // 2. Uploaded layers (grouped by layer_name)
            const { data: layerRows, error } = await supabase
                .from("uploaded_layers")
                .select("layer_name");

            if (!error && layerRows) {
                const layerMap = new Map<string, number>();
                layerRows.forEach((row: { layer_name: string }) => {
                    layerMap.set(row.layer_name, (layerMap.get(row.layer_name) || 0) + 1);
                });
                layerMap.forEach((count, name) => {
                    items.push({ name, featureCount: count, type: "uploaded" });
                });
            }

            setDatasets(items);
        } catch (err) {
            console.error("Failed to load datasets:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith(".geojson") && !file.name.endsWith(".json")) {
            setUploadError("Format harus .geojson atau .json");
            return;
        }

        setUploading(true);
        setUploadError(null);

        try {
            const text = await file.text();
            const geojson = JSON.parse(text);

            if (geojson.type !== "FeatureCollection" || !Array.isArray(geojson.features)) {
                setUploadError("File bukan GeoJSON FeatureCollection yang valid");
                setUploading(false);
                return;
            }

            const layerName = file.name.replace(/\.(geojson|json)$/, "");
            const supabase = createClient();

            // Remove existing with same name
            await supabase.from("uploaded_layers").delete().eq("layer_name", layerName);

            // Insert features
            const rows = geojson.features.map((f: any, idx: number) => ({
                layer_name: layerName,
                feature_index: idx,
                properties: f.properties || {},
                geom: JSON.stringify(f.geometry),
            }));

            const { error: dbError } = await supabase.from("uploaded_layers").insert(rows);

            if (dbError) {
                setUploadError(`Gagal simpan: ${dbError.message}`);
            } else {
                await loadDatasets(); // Refresh list
            }
        } catch {
            setUploadError("Gagal membaca file GeoJSON");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleDelete = async (name: string) => {
        const supabase = createClient();
        await supabase.from("uploaded_layers").delete().eq("layer_name", name);
        await loadDatasets();
    };

    const filtered = datasets.filter(d =>
        d.name.toLowerCase().includes(search.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="w-[520px] max-h-[80vh] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/60 flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-md">
                            <Database className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Data Catalogue</h2>
                            <p className="text-[12px] text-slate-500">Browse & manage spatial datasets</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-all text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search + Upload */}
                <div className="px-6 py-3 flex items-center gap-3 border-b border-slate-100">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search datasets..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all"
                        />
                    </div>
                    <input ref={fileInputRef} type="file" accept=".geojson,.json" onChange={handleUpload} className="hidden" />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-xl shadow-md disabled:opacity-50 transition-all"
                    >
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        Upload GeoJSON
                    </button>
                </div>
                {uploadError && <p className="px-6 py-1.5 text-[12px] text-red-500 bg-red-50">{uploadError}</p>}

                {/* Dataset List */}
                <div className="flex-1 overflow-y-auto px-6 py-3">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                            <span className="ml-3 text-sm text-slate-500">Loading datasets...</span>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-12">
                            <Database className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                            <p className="text-sm text-slate-500">No datasets found</p>
                            <p className="text-[12px] text-slate-400 mt-1">Upload a GeoJSON file to get started</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filtered.map(ds => (
                                <div
                                    key={ds.name}
                                    className="flex items-center gap-3 px-4 py-3 bg-slate-50/80 hover:bg-slate-100 rounded-xl border border-slate-100 transition-all group"
                                >
                                    <MapPin className="w-5 h-5 text-blue-500 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[14px] font-semibold text-slate-700 truncate">{ds.name}</p>
                                        <p className="text-[12px] text-slate-500">
                                            {ds.featureCount.toLocaleString()} features ·{" "}
                                            <span className={ds.type === "system" ? "text-blue-500" : "text-emerald-500"}>
                                                {ds.type === "system" ? "System" : "Uploaded"}
                                            </span>
                                        </p>
                                    </div>
                                    {ds.type === "uploaded" && (
                                        <button
                                            onClick={() => handleDelete(ds.name)}
                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-slate-100 text-center">
                    <p className="text-[11px] text-slate-400">{datasets.length} dataset(s) available in Supabase</p>
                </div>
            </div>
        </div>
    );
}
