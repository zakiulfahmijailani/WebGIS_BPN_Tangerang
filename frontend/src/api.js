import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '',
    headers: { 'Content-Type': 'application/json' },
});

/**
 * Fetch buildings GeoJSON FeatureCollection.
 */
export async function getBuildings() {
    const res = await api.get('/api/buildings');
    return res.data;
}

/**
 * Fetch geospatial metrics from the backend.
 */
export async function getMetrics() {
    const res = await api.get('/api/metrics');
    return res.data;
}

/**
 * Send a message to the AI Chatbot.
 */
export async function postChat(message) {
    const res = await api.post('/api/chat', { message });
    return res.data;
}

export default api;
