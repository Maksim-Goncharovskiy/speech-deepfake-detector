import axios, { AxiosError } from 'axios';
import { Prediction, ApiError } from '../types';


const API_BASE_URL = '/api';


const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'multipart/form-data',
    },
    timeout: 3600000
});


export const analyzeAudioFile = async (file: File, onProgress?: (progress: number) => void): Promise<Prediction> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<Prediction>('/process', formData, {
        onUploadProgress: (progressEvent) => {
            if (progressEvent.total && onProgress) {
                const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress(percent);
            }
        },
        headers: {
            'Content-Type': 'multipart/form-data', 
        },
    });

    return response.data;
};