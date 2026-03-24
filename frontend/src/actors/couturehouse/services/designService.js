import axios from 'axios';

const API_URL = 'http://localhost:8000/api/couturehouse';

// Helper to get token (adjust based on your storage strategy)
const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const designService = {
    getDesigns: async () => {
        const response = await axios.get(`${API_URL}/designs/`, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    getDesign: async (id) => {
        const response = await axios.get(`${API_URL}/designs/${id}/`, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    createDesign: async (designData) => {
        const response = await axios.post(`${API_URL}/designs/`, designData, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    uploadMedia: async (designId, formData) => {
        const response = await axios.post(`${API_URL}/designs/${designId}/media/`, formData, {
            headers: {
                ...getAuthHeader(),
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    publishDesign: async (id) => {
        const response = await axios.post(`${API_URL}/designs/${id}/publish/`, {}, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    archiveDesign: async (id) => {
        const response = await axios.post(`${API_URL}/designs/${id}/archive/`, {}, {
            headers: getAuthHeader()
        });
        return response.data;
    }
};

export default designService;
