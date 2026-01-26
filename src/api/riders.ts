import apiClient from './client';

export interface Rider {
  id: number;
  name: string;
  phone: string;
  email?: string;
  is_available?: boolean;
}

export const ridersApi = {
  /** Get all available riders (for store managers to assign orders). Returns [] if backend has no /riders or /users?role=rider. */
  getAll: async (): Promise<Rider[]> => {
    try {
      const response = await apiClient.get<{ data: Rider[] } | Rider[]>('/riders');
      const data = response.data;
      if (Array.isArray(data)) return data;
      return (data as any)?.data ?? [];
    } catch {
      try {
        const altResponse = await apiClient.get<{ data: Rider[] }>('/users?role=rider');
        return altResponse.data?.data ?? [];
      } catch {
        return [];
      }
    }
  },
};
