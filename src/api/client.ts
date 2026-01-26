import axios from 'axios';
import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../utils/constants';

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request interceptor: Add auth token; allow FormData to set Content-Type (multipart)
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.data instanceof FormData && config.headers) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response) {
      const { status, data } = error.response;

      // Handle 401 Unauthorized - redirect to login
      if (status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      // Handle 422 Validation errors
      if (status === 422) {
        const validationErrors = data?.errors ?? {};
        console.warn('Validation Error (422):', { 
          validationErrors, 
          message: data?.message,
          fullResponse: data,
        });
        return Promise.reject({
          ...error,
          message: data?.message || 'Validation failed.',
          validationErrors: validationErrors as Record<string, string[]>,
        });
      }

      // Handle 500 Server errors
      if (status === 500) {
        console.error('Server Error (500):', {
          url: error.config?.url,
          method: error.config?.method,
          requestData: error.config?.data,
          responseStatus: status,
          responseData: data,
          fullResponse: error.response,
        });
        // Try to extract more details from the response
        const errorMessage = data?.message || 
                            (typeof data === 'string' ? data : 'Server error. Please check the backend logs.') ||
                            'Server error. Please check the backend logs or contact support.';
        return Promise.reject({
          ...error,
          message: errorMessage,
        });
      }

      // Handle other errors
      return Promise.reject({
        ...error,
        message: data.message || 'An error occurred',
      });
    }

    // Network errors
    if (error.request) {
      return Promise.reject({
        ...error,
        message: 'Connection failed. Please check your internet connection.',
      });
    }

    return Promise.reject(error);
  }
);

export default apiClient;
