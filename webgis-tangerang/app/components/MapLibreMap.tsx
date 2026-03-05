'use client';

import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export interface FlyToCommand {
    center: [number, number]; // [lng, lat]
    zoom: number;
    label?: string;
    boundingBox?: [number, number, number, number]; // [minX, minY, maxX, maxY]
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

        const styleUrl = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: styleUrl as any,
            center: [106.63, -6.17], // Tangerang
            zoom: 12,
        });

        map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

        // Add Scale Control (Metric units)
        map.current.addControl(new maplibregl.ScaleControl({
            maxWidth: 100,
            unit: 'metric'
        }), 'bottom-left');

        const map_ = map.current;

        // Click handler for buildings and AI results
        const handleMapClick = (e: maplibregl.MapMouseEvent) => {
            const layers = [
                'buildings-fill',
                'ai-result-layer',
                'city-fill',
                'kecamatan-fill',
                'kelurahan-fill'
            ].filter(id => map_.getLayer(id));

            const features = map_.queryRenderedFeatures(e.point, {
                layers: layers,
            });

            if (!features.length) return;

            // Enforce logical priority when multiple layers are clicked
            const priority: Record<string, number> = {
                'ai-result-layer': 1,
                'buildings-fill': 2,
                'kelurahan-fill': 3,
                'kecamatan-fill': 4,
                'city-fill': 5
            };

            features.sort((a, b) => {
                const pA = priority[a.layer.id] || 99;
                const pB = priority[b.layer.id] || 99;
                return pA - pB;
            });

            const feature = features[0];
            const props = feature.properties || {};
            const layerId = feature.layer.id;

            // Determine Title based on layer
            let title = 'Feature Details';
            if (layerId === 'buildings-fill') title = 'Building Details';
            else if (layerId === 'ai-result-layer') title = 'AI Analysis Result';
            else if (layerId.includes('city')) title = 'City Boundary';
            else if (layerId.includes('kecamatan')) title = 'Kecamatan Details';
            else if (layerId.includes('kelurahan')) title = 'Kelurahan Details';

            // Format properties as HTML for the popup (Matching user screenshot style)
            const content = `
                <div class="p-4 min-w-[220px]">
                    <h4 class="font-bold text-blue-600 text-base mb-3 leading-tight">${title}</h4>
                    <div class="space-y-2 max-h-[250px] overflow-y-auto pr-2 scrollbar-thin">
                        ${Object.entries(props).map(([key, val]) => `
                            <div class="text-[13px] leading-relaxed">
                                <span class="font-bold text-slate-800">${key}:</span> 
                                <span class="text-slate-600 ml-1">${val}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            new maplibregl.Popup({
                className: 'glass-popup',
                closeButton: true,
                closeOnClick: true,
                maxWidth: '300px',
                anchor: 'bottom'
            })
                .setLngLat(e.lngLat)
                .setHTML(content)
                .addTo(map_);
        };

        map_.on('click', handleMapClick);

        // Hover cursor effects for ALL interactive layers
        const interactiveLayers = [
            'buildings-fill',
            'ai-result-layer',
            'city-fill',
            'kecamatan-fill',
            'kelurahan-fill'
        ];

        const handleMouseEnter = () => { map_.getCanvas().style.cursor = 'pointer'; };
        const handleMouseLeave = () => { map_.getCanvas().style.cursor = ''; };

        interactiveLayers.forEach(layer => {
            map_.on('mouseenter', layer, handleMouseEnter);
            map_.on('mouseleave', layer, handleMouseLeave);
        });

        return () => {
            map_.off('click', handleMapClick);
            interactiveLayers.forEach(layer => {
                map_.off('mouseenter', layer, handleMouseEnter);
                map_.off('mouseleave', layer, handleMouseLeave);
            });
            map_.remove();
            map.current = null;
        };
    }, []);

    // Handle flyTo and fitBounds commands from chat or layer actions
    useEffect(() => {
        if (!map.current || !flyToCommand) return;

        if (flyToCommand.boundingBox) {
            map.current.fitBounds(flyToCommand.boundingBox, {
                padding: 50,
                duration: 2000,
                essential: true
            });
        } else {
            map.current.flyTo({
                center: flyToCommand.center,
                zoom: flyToCommand.zoom,
                duration: 2000,
                essential: true,
            });
        }
    }, [flyToCommand]);

    // Enforce rendering order (Bottom to Top)
    const enforceLayerOrder = useCallback(() => {
        if (!map.current) return;
        const map_ = map.current;
        const order = [
            'city-fill', 'city-outline',
            'kecamatan-fill', 'kecamatan-outline',
            'kelurahan-fill', 'kelurahan-outline',
            'buildings-fill', 'buildings-outline',
            'ai-result-layer', 'ai-result-outline'
        ];

        for (const layerId of order) {
            if (map_.getLayer(layerId)) {
                map_.moveLayer(layerId); // Moves to front
            }
        }
    }, []);

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
                        'fill-color': '#1e40af', // Biru Pekat (Deep Blue)
                        'fill-opacity': 0.7,
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
            enforceLayerOrder();
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
                        'line-width': 3.5,
                    },
                });
                map.current!.addLayer({
                    id: `${layerName}-fill`,
                    type: 'fill',
                    source: `${layerName}-source`,
                    paint: {
                        'fill-color': color,
                        'fill-opacity': 0,
                    },
                });
            }
            enforceLayerOrder();
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
            enforceLayerOrder();
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
