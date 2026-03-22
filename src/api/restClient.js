import axios from 'axios';

const BASE_URL = import.meta.env.VITE_BACKEND_URL || "https://localhost:7258";

const restInstance = axios.create({
    baseURL: `${BASE_URL}/api`,
});

export const restApi = {
    getAllBooks: () => restInstance.get('/books'),
    createBook: (data) => restInstance.post('/books', data),
    uploadImage: (file) => {
        const formData = new FormData();
        formData.append('image', file);
        return restInstance.post('/books/upload-only', formData);
    },
    deleteBook: (id) => restInstance.delete(`/books/${id}`)
};