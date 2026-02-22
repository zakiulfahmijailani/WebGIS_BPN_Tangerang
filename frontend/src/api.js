import axios from 'axios';

const api = axios.create({
    baseURL: '',
    headers: { 'Content-Type': 'application/json' },
});

export async function getBuildings() {
    const res = await api.get('/api/buildings');
    return res.data;
}

export async function getBoundary(layer) {
    const res = await api.get(`/api/boundaries/${layer}`);
    return res.data;
}

export async function getMetrics() {
    const res = await api.get('/api/metrics');
    return res.data;
}

export async function postChat(message) {
    const res = await api.post('/api/chat', { message });
    return res.data;
}

export default api;
