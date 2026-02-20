import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '',
    headers: { 'Content-Type': 'application/json' },
});

/**
 * Fetch healthcare points as GeoJSON FeatureCollection.
 * @param {string} [amenity] - Optional filter by amenity type
 */
export async function getHealthcare(amenity) {
    const params = amenity ? { amenity } : {};
    const res = await api.get('/api/healthcare', { params });
    return res.data;
}

export default api;
