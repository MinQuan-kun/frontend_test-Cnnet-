import axios from 'axios';

const BASE_URL = import.meta.env.VITE_BACKEND_URL || "https://localhost:7258";

const restInstance = axios.create({
    baseURL: `${BASE_URL}/api`,
});

export const restApi = {
    getAllGames: () => restInstance.get('/games'),
    createGame: (data) => restInstance.post('/games', data),
    updateGame: (id, data) => restInstance.put(`/games/${id}`, data),
    uploadImage: (file) => {
        const formData = new FormData();
        formData.append('image', file);
        return restInstance.post('/games/upload-only', formData);
    },
    deleteGame: (id) => restInstance.delete(`/games/${id}`)
};