'use client';

import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export interface FlyToCommand {
    center: [number, number]; // [lng, lat]
    zoom: number;
    label?: string;
}

interface MapLibreMapProps {
    aiLayer: {
        geojson: GeoJSON.FeatureCollection | null;
        style: any;
        layerType: string;
        visible: boolean;
    };
    buildingsData: GeoJSON.FeatureCollection | null;
    showBuildings: boolean;
    showCity: boolean;
    showKecamatan: boolean;
    showKelurahan: boolean;
    flyToCommand: FlyToCommand | null;
}

export default function MapLibreMap({
    aiLayer,
    buildingsData,
    showBuildings,
    showCity,
    showKecamatan,
    showKelurahan,
    flyToCommand,
}: MapLibreMapProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const cityLoaded = useRef(false);
    const kecamatanLoaded = useRef(false);
    const kelurahanLoaded = useRef(false);

    // Initialize MapLibre map
    useEffect(() => {
        if (!mapContainer.current || map.current) return;

        const mapTilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;
        const styleUrl = mapTilerKey && mapTilerKey !== 'YOUR_MAPTILER_API_KEY'
            ? `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${mapTilerKey}`
            : {
                version: 8,
                sources: {
                    osm: {
                        type: 'raster',
                        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                        tileSize: 256,
                        attribution: '&copy; OpenStreetMap Contributors',
                    },
                },
                layers: [
                    {
                        id: 'osm-tiles',
                        type: 'raster',
                        source: 'osm',
                        minzoom: 0,
                        maxzoom: 19,
                    },
                ],
            };

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: styleUrl as any,
            center: [106.63, -6.17], // Tangerang
            zoom: 12,
        });

        map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

        return () => {
            map.current?.remove();
            map.current = null;
        };
    }, []);

    // Handle flyTo commands from chat
    useEffect(() => {
        if (!map.current || !flyToCommand) return;
        map.current.flyTo({
            center: flyToCommand.center,
            zoom: flyToCommand.zoom,
            duration: 2000,
            essential: true,
        });
    }, [flyToCommand]);

    // Load buildings layer on mount
    useEffect(() => {
        if (!map.current || !buildingsData) return;

        const loadBuildings = () => {
            if (map.current!.getSource('buildings-source')) {
                (map.current!.getSource('buildings-source') as maplibregl.GeoJSONSource).setData(buildingsData);
            } else {
                map.current!.addSource('buildings-source', {
                    type: 'geojson',
                    data: buildingsData,
                });
                map.current!.addLayer({
                    id: 'buildings-fill',
                    type: 'fill',
                    source: 'buildings-source',
                    paint: {
                        'fill-color': [
                            'match',
                            ['get', 'type'],
                            'Residential', '#4ade80',
                            'Commercial', '#facc15',
                            'Public', '#60a5fa',
                            'Industrial', '#f97316',
                            'Empty', '#a1a1aa',
                            '#94a3b8',
                        ],
                        'fill-opacity': 0.6,
                    },
                });
                map.current!.addLayer({
                    id: 'buildings-outline',
                    type: 'line',
                    source: 'buildings-source',
                    paint: {
                        'line-color': '#334155',
                        'line-width': 0.5,
                    },
                });
            }
        };

        if (map.current.isStyleLoaded()) {
            loadBuildings();
        } else {
            map.current.on('load', loadBuildings);
        }
    }, [buildingsData]);

    // Toggle buildings visibility
    useEffect(() => {
        if (!map.current) return;
        const vis = showBuildings ? 'visible' : 'none';
        if (map.current.getLayer('buildings-fill')) {
            map.current.setLayoutProperty('buildings-fill', 'visibility', vis);
            map.current.setLayoutProperty('buildings-outline', 'visibility', vis);
        }
    }, [showBuildings]);

    // Load kecamatan boundaries
    const loadBoundary = useCallback(async (layerName: string, color: string) => {
        if (!map.current) return;
        try {
            const res = await fetch(`/api/boundaries/${layerName}`);
            const data = await res.json();
            if (!map.current!.getSource(`${layerName}-source`)) {
                map.current!.addSource(`${layerName}-source`, {
                    type: 'geojson',
                    data,
                });
                map.current!.addLayer({
                    id: `${layerName}-outline`,
                    type: 'line',
                    source: `${layerName}-source`,
                    paint: {
                        'line-color': color,
                        'line-width': 2,
                        'line-dasharray': [3, 2],
                    },
                });
                map.current!.addLayer({
                    id: `${layerName}-fill`,
                    type: 'fill',
                    source: `${layerName}-source`,
                    paint: {
                        'fill-color': color,
                        'fill-opacity': 0.05,
                    },
                });
            }
        } catch (err) {
            console.error(`Failed to load ${layerName}:`, err);
        }
    }, []);

    useEffect(() => {
        if (!map.current) return;
        const doLoad = () => {
            if (showCity && !cityLoaded.current) {
                loadBoundary('city', '#3b82f6'); // Blue for city
                cityLoaded.current = true;
            }
            if (showCity && map.current?.getLayer('city-outline')) {
                map.current.setLayoutProperty('city-outline', 'visibility', 'visible');
                map.current.setLayoutProperty('city-fill', 'visibility', 'visible');
            } else if (!showCity && map.current?.getLayer('city-outline')) {
                map.current.setLayoutProperty('city-outline', 'visibility', 'none');
                map.current.setLayoutProperty('city-fill', 'visibility', 'none');
            }
        };
        if (map.current.isStyleLoaded()) doLoad();
        else map.current.on('load', doLoad);
    }, [showCity, loadBoundary]);

    useEffect(() => {
        if (!map.current) return;
        const doLoad = () => {
            if (showKecamatan && !kecamatanLoaded.current) {
                loadBoundary('kecamatan', '#f472b6');
                kecamatanLoaded.current = true;
            }
            if (showKecamatan && map.current?.getLayer('kecamatan-outline')) {
                map.current.setLayoutProperty('kecamatan-outline', 'visibility', 'visible');
                map.current.setLayoutProperty('kecamatan-fill', 'visibility', 'visible');
            } else if (!showKecamatan && map.current?.getLayer('kecamatan-outline')) {
                map.current.setLayoutProperty('kecamatan-outline', 'visibility', 'none');
                map.current.setLayoutProperty('kecamatan-fill', 'visibility', 'none');
            }
        };
        if (map.current.isStyleLoaded()) doLoad();
        else map.current.on('load', doLoad);
    }, [showKecamatan, loadBoundary]);

    useEffect(() => {
        if (!map.current) return;
        const doLoad = () => {
            if (showKelurahan && !kelurahanLoaded.current) {
                loadBoundary('kelurahan', '#c084fc');
                kelurahanLoaded.current = true;
            }
            if (showKelurahan && map.current?.getLayer('kelurahan-outline')) {
                map.current.setLayoutProperty('kelurahan-outline', 'visibility', 'visible');
                map.current.setLayoutProperty('kelurahan-fill', 'visibility', 'visible');
            } else if (!showKelurahan && map.current?.getLayer('kelurahan-outline')) {
                map.current.setLayoutProperty('kelurahan-outline', 'visibility', 'none');
                map.current.setLayoutProperty('kelurahan-fill', 'visibility', 'none');
            }
        };
        if (map.current.isStyleLoaded()) doLoad();
        else map.current.on('load', doLoad);
    }, [showKelurahan, loadBoundary]);

    // Update AI result layer when aiLayer changes
    useEffect(() => {
        if (!map.current || !aiLayer.geojson || !aiLayer.visible) return;
        const map_ = map.current;

        const addDynamicLayer = () => {
            // Remove old AI layer if exists
            if (map_.getLayer('ai-result-layer')) map_.removeLayer('ai-result-layer');
            if (map_.getLayer('ai-result-outline')) map_.removeLayer('ai-result-outline');
            if (map_.getSource('ai-result')) map_.removeSource('ai-result');

            // Add new GeoJSON source
            map_.addSource('ai-result', {
                type: 'geojson',
                data: aiLayer.geojson as GeoJSON.FeatureCollection,
            });

            // Apply the LLM-generated style directly to the layer
            map_.addLayer({
                id: 'ai-result-layer',
                type: aiLayer.style?.type || 'fill',
                source: 'ai-result',
                paint: aiLayer.style?.paint || {
                    'fill-color': '#06b6d4',
                    'fill-opacity': 0.7,
                },
            });

            // Optional: If aiLayer.style requires a complementary outline explicitly
            if (aiLayer.style?.type === 'fill' && aiLayer.style?.paint?.['fill-outline-color']) {
                // We don't necessarily need a separate line layer if fill-outline-color is used, 
                // as mapbox supports it directly in fill type, but if we wanted thicker borders:
                // map_.addLayer(...)
            }

            // Fit map to AI result bounds
            if (aiLayer.geojson?.features && aiLayer.geojson.features.length > 0) {
                const bounds = new maplibregl.LngLatBounds();
                aiLayer.geojson.features.forEach((f) => {
                    if (f.geometry.type === 'Point') {
                        const coords = f.geometry.coordinates as [number, number];
                        bounds.extend(coords);
                    } else if (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon') {
                        const coordsArray = f.geometry.type === 'Polygon'
                            ? f.geometry.coordinates
                            : f.geometry.coordinates.flat();
                        coordsArray.forEach((ring) => {
                            (ring as [number, number][]).forEach((coord) => bounds.extend(coord));
                        });
                    }
                });
                if (!bounds.isEmpty()) {
                    map_.fitBounds(bounds, { padding: 60, maxZoom: 16 });
                }
            }
        };

        if (map_.isStyleLoaded()) {
            addDynamicLayer();
        } else {
            map_.on('load', addDynamicLayer);
        }
    }, [aiLayer]);

    return (
        <div className="relative w-full h-full">
            <div ref={mapContainer} className="w-full h-full" />
        </div>
    );
}
