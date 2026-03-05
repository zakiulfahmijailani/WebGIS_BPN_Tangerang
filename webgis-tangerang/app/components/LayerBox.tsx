'use client';

import { useState, useRef, useEffect } from 'react';
import { Layers, Upload, ChevronDown, Eye, EyeOff, MoreHorizontal, Loader2 } from 'lucide-react';
import { createClient } from '../../lib/supabaseClient';

interface LayerBoxProps {
    showCity: boolean;
    setShowCity: (v: boolean) => void;
    showBuildings: boolean;
    setShowBuildings: (v: boolean) => void;
    showKecamatan: boolean;
    setShowKecamatan: (v: boolean) => void;
    showKelurahan: boolean;
    setShowKelurahan: (v: boolean) => void;
    onGeoJSONUploaded?: (data: GeoJSON.FeatureCollection) => void;
    onLayerAction?: (action: string, layerId: string) => void;
}

interface UploadedLayer {
    name: string;
    featureCount: number;
    visible: boolean;
    color: string;
}

const LAYER_COLORS = ['#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function LayerBox({
    showCity, setShowCity,
    showBuildings, setShowBuildings,
    showKecamatan, setShowKecamatan,
    showKelurahan, setShowKelurahan,
    onGeoJSONUploaded,
    onLayerAction,
}: LayerBoxProps) {
    const [collapsed, setCollapsed] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadedLayers, setUploadedLayers] = useState<UploadedLayer[]>([]);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [loadingLayers, setLoadingLayers] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load existing uploaded layers from Supabase on mount
    useEffect(() => {
        const loadLayers = async () => {
            setLoadingLayers(true);
            try {
                const supabase = createClient();
                // Get distinct layer names + feature counts
                const { data, error } = await supabase
                    .from('uploaded_layers')
                    .select('layer_name')
                    .order('layer_name');

                if (error) {
                    console.error('Failed to load layers:', error.message || error);
                    setLoadingLayers(false);
                    return;
                }

                if (data && data.length > 0) {
                    // Group by layer_name to get unique layers + count
                    const layerMap = new Map<string, number>();
                    data.forEach((row: { layer_name: string }) => {
                        layerMap.set(row.layer_name, (layerMap.get(row.layer_name) || 0) + 1);
                    });

                    const layers: UploadedLayer[] = Array.from(layerMap.entries()).map(
                        ([name, count], idx) => ({
                            name,
                            featureCount: count,
                            visible: true,
                            color: LAYER_COLORS[idx % LAYER_COLORS.length],
                        })
                    );
                    setUploadedLayers(layers);

                    // Also fetch full GeoJSON for the first layer to show on map
                    if (layers.length > 0 && onGeoJSONUploaded) {
                        const { data: features } = await supabase
                            .from('uploaded_layers')
                            .select('properties, geom')
                            .eq('layer_name', layers[0].name);

                        if (features && features.length > 0) {
                            const geojson: GeoJSON.FeatureCollection = {
                                type: 'FeatureCollection',
                                features: features.map((f: { properties: any; geom: string }) => ({
                                    type: 'Feature',
                                    properties: f.properties,
                                    geometry: typeof f.geom === 'string' ? JSON.parse(f.geom) : f.geom,
                                })),
                            };
                            onGeoJSONUploaded(geojson);
                        }
                    }
                }
            } catch (err) {
                console.error('Error loading layers:', err);
            } finally {
                setLoadingLayers(false);
            }
        };

        loadLayers();
    }, []);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.geojson') && !file.name.endsWith('.json')) {
            setUploadError('Format harus .geojson atau .json');
            return;
        }

        setUploading(true);
        setUploadError(null);

        try {
            const text = await file.text();
            const geojson = JSON.parse(text);

            if (geojson.type !== 'FeatureCollection' || !Array.isArray(geojson.features)) {
                setUploadError('File bukan GeoJSON FeatureCollection yang valid');
                setUploading(false);
                return;
            }

            const layerName = file.name.replace(/\.(geojson|json)$/, '');
            const supabase = createClient();

            // Check apakah layer dengan nama ini sudah ada
            const { data: existing } = await supabase
                .from('uploaded_layers')
                .select('layer_name')
                .eq('layer_name', layerName)
                .limit(1);

            if (existing && existing.length > 0) {
                // Hapus dulu yang lama
                await supabase
                    .from('uploaded_layers')
                    .delete()
                    .eq('layer_name', layerName);
            }

            // Insert semua features ke Supabase
            const rows = geojson.features.map((f: any, idx: number) => ({
                layer_name: layerName,
                feature_index: idx,
                properties: f.properties || {},
                geom: JSON.stringify(f.geometry),
            }));

            const { error: dbError } = await supabase
                .from('uploaded_layers')
                .insert(rows);

            if (dbError) {
                console.error('Supabase insert error:', dbError);
                setUploadError(`Gagal simpan ke database: ${dbError.message}`);
                setUploading(false);
                return;
            }

            // Tambahkan ke tampilan layer box
            setUploadedLayers(prev => {
                // Cek kalau sudah ada (replace), kalau belum add
                const exists = prev.findIndex(l => l.name === layerName);
                const newLayer: UploadedLayer = {
                    name: layerName,
                    featureCount: geojson.features.length,
                    visible: true,
                    color: LAYER_COLORS[exists >= 0 ? exists : prev.length % LAYER_COLORS.length],
                };
                if (exists >= 0) {
                    return prev.map((l, i) => i === exists ? newLayer : l);
                }
                return [...prev, newLayer];
            });

            // Tampilkan di peta
            if (onGeoJSONUploaded) {
                onGeoJSONUploaded(geojson);
            }
        } catch (err) {
            setUploadError('Gagal membaca file GeoJSON');
            console.error('Upload error:', err);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDeleteLayer = async (layerName: string, idx: number) => {
        try {
            const supabase = createClient();
            const { error } = await supabase
                .from('uploaded_layers')
                .delete()
                .eq('layer_name', layerName);

            if (error) {
                console.error('Supabase delete error:', error);
                return;
            }

            // Hapus dari UI setelah berhasil delete dari DB
            setUploadedLayers(prev => prev.filter((_, i) => i !== idx));
        } catch (err) {
            console.error('Delete error:', err);
        }
    };

    if (collapsed) {
        return (
            <button
                onClick={() => setCollapsed(false)}
                className="glass-dark w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 transition-all shadow-xl"
                title="Expand Layers"
            >
                <Layers className="w-5 h-5 transition-transform hover:scale-110" />
            </button>
        );
    }

    return (
        <div className="glass-dark min-w-[220px] max-w-[260px] shadow-xl text-white transition-all duration-300 transform origin-bottom">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-300" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-200">Layers</span>
                </div>
                <button
                    onClick={() => setCollapsed(true)}
                    className="p-1 hover:bg-white/10 rounded transition-all"
                    title="Collapse Layers"
                >
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>
            </div>

            {/* Layer List */}
            <div className="px-2 py-2 space-y-0.5 max-h-[250px] overflow-y-auto scrollbar-thin">
                <LayerRow id="buildings" label="Buildings" active={showBuildings} color="#4ade80" onToggle={() => setShowBuildings(!showBuildings)} onAction={onLayerAction} />
                <LayerRow id="kelurahan" label="Kelurahan" active={showKelurahan} color="#c084fc" onToggle={() => setShowKelurahan(!showKelurahan)} onAction={onLayerAction} />
                <LayerRow id="kecamatan" label="Batas Kecamatan" active={showKecamatan} color="#f472b6" onToggle={() => setShowKecamatan(!showKecamatan)} onAction={onLayerAction} />
                <LayerRow id="city" label="Batas Kota" active={showCity} color="#3b82f6" onToggle={() => setShowCity(!showCity)} onAction={onLayerAction} />

                {/* Divider jika ada uploaded layers */}
                {uploadedLayers.length > 0 && (
                    <div className="border-t border-white/10 my-1 pt-1">
                        <span className="text-[9px] uppercase tracking-wider text-slate-500 px-2">Uploaded</span>
                    </div>
                )}

                {/* Loading state */}
                {loadingLayers && (
                    <div className="flex items-center gap-2 px-2 py-1.5 text-slate-500">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span className="text-[10px]">Loading layers...</span>
                    </div>
                )}

                {/* Uploaded layers */}
                {uploadedLayers.map((layer, idx) => (
                    <LayerRow
                        key={idx}
                        id={`uploaded-${idx}`}
                        label={layer.name}
                        active={layer.visible}
                        color={layer.color}
                        count={layer.featureCount}
                        onToggle={() => {
                            setUploadedLayers(prev => prev.map((l, i) => i === idx ? { ...l, visible: !l.visible } : l));
                        }}
                        onAction={(action, lId) => {
                            if (action === 'delete') {
                                handleDeleteLayer(layer.name, idx);
                            } else {
                                onLayerAction?.(action, lId);
                            }
                        }}
                    />
                ))}
            </div>

            {/* Upload Button */}
            <div className="px-2 pb-2 pt-1 border-t border-white/10">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".geojson,.json"
                    onChange={handleFileUpload}
                    className="hidden"
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium 
                               bg-white/10 hover:bg-white/15 rounded-lg transition-all disabled:opacity-50"
                >
                    {uploading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <Upload className="w-3.5 h-3.5" />
                    )}
                    {uploading ? 'Uploading ke Supabase...' : 'Upload GeoJSON'}
                </button>
                {uploadError && (
                    <p className="text-[10px] text-red-400 mt-1 px-1">{uploadError}</p>
                )}
            </div>
        </div>
    );
}

function LayerRow({
    id,
    label,
    active,
    color,
    count,
    onToggle,
    onAction,
}: {
    id: string;
    label: string;
    active: boolean;
    color: string;
    count?: number;
    onToggle: () => void;
    onAction?: (action: string, layerId: string) => void;
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [exportMenuOpen, setExportMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
                setExportMenuOpen(false);
            }
        };
        if (menuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [menuOpen]);

    return (
        <div className="relative group flex items-center w-full px-2 py-1.5 rounded-lg hover:bg-white/5 transition-all">
            <button
                onClick={onToggle}
                className="flex items-center justify-between gap-2 flex-1"
                title={`Toggle ${label}`}
            >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div
                        className="w-3 h-3 rounded-[2px] border transition-all flex-shrink-0"
                        style={{
                            backgroundColor: active ? color : 'transparent',
                            borderColor: color,
                        }}
                    />
                    <span className="text-xs text-slate-300 font-medium text-left truncate flex-1">{label}</span>
                    {count !== undefined && (
                        <span className="text-[10px] text-slate-500 mr-1 flex-shrink-0">{count} ft</span>
                    )}
                </div>

                {active ? (
                    <Eye className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                ) : (
                    <EyeOff className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                )}
            </button>

            {/* Options Menu Trigger */}
            <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); setExportMenuOpen(false); }}
                className={`ml-1 flex-shrink-0 p-1 rounded-md transition-all ${menuOpen ? 'bg-white/20 text-white' : 'opacity-0 group-hover:opacity-100 bg-white/5 hover:bg-white/20 text-slate-400 hover:text-white'}`}
                title="Options"
            >
                <MoreHorizontal className="w-3.5 h-3.5" />
            </button>

            {/* Dropdown Menu */}
            {menuOpen && (
                <div
                    ref={menuRef}
                    className="absolute right-0 top-full mt-1 w-44 bg-[#1e1e1e] border border-white/10 rounded-md shadow-2xl z-50 py-1"
                >
                    {!exportMenuOpen ? (
                        <>
                            <button
                                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onAction?.('zoom', id); }}
                                className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                            >
                                Zoom to layer
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onAction?.('view-attributes', id); }}
                                className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                            >
                                View attributes
                            </button>
                            <div className="border-t border-white/5 my-1"></div>
                            <button
                                onClick={(e) => { e.stopPropagation(); setExportMenuOpen(true); }}
                                className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10 hover:text-white transition-colors flex justify-between items-center"
                            >
                                Export as... <span className="text-[10px] text-slate-500">❯</span>
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onAction?.('delete', id); }}
                                className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
                            >
                                Delete layer
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={(e) => { e.stopPropagation(); setExportMenuOpen(false); }}
                                className="w-full text-left px-3 py-1 text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1 mb-1 font-medium"
                            >
                                <span className="text-[10px]">❮</span> Back
                            </button>
                            <div className="border-t border-white/5 mb-1"></div>
                            {['GeoJSON (.geojson)', 'Shapefile (.zip)', 'FlatGeobuf (.fgb)', 'GeoPackage (.gpkg)', 'DXF (.dxf)'].map(format => (
                                <button
                                    key={format}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setMenuOpen(false);
                                        setExportMenuOpen(false);
                                        onAction?.(`export-${format.split(' ')[0].toLowerCase()}`, id);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                                >
                                    {format}
                                </button>
                            ))}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
