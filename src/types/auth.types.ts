export type UserRole = 'customer' | 'restaurant' | 'rider' | 'admin';

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  email_verified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  phone: string;
  password: string;
  password_confirmation: string;
  role: 'customer' | 'restaurant' | 'rider';
}

export interface AuthResponse {
  message: string;
  data: {
    user: User;
    token: string;
  };
}

