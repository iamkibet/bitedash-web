import apiClient from './client';
import type { LoginCredentials, RegisterData, AuthResponse, User } from '../types/auth.types';

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/login', credentials);
    console.log('Login API response:', response.data);
    return response.data;
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/register', data);
    console.log('Register API response:', response.data);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/logout');
  },

  getProfile: async (): Promise<User> => {
    const response = await apiClient.get<{ data: User }>('/user');
    return response.data.data;
  },

  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await apiClient.put<{ data: User }>('/user', data);
    return response.data.data;
  },
};
