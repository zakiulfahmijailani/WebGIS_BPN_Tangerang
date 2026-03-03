'use client';

import { useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

interface RealtimeListenerProps {
    sessionId: string;
    onMapUpdate: (geojson: GeoJSON.FeatureCollection) => void;
}

export function RealtimeListener({ sessionId, onMapUpdate }: RealtimeListenerProps) {
    useEffect(() => {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const channel = supabase
            .channel('ai-map-updates')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'ai_map_updates',
                    filter: `session_id=eq.${sessionId}`,
                },
                (payload) => {
                    // This fires the MOMENT the backend writes the GeoJSON
                    const newData = payload.new as { geojson_result: GeoJSON.FeatureCollection };
                    if (newData.geojson_result) {
                        onMapUpdate(newData.geojson_result);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [sessionId, onMapUpdate]);

    return null; // Invisible component
}
