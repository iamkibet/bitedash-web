import { create } from 'zustand';
import type { User, UserRole, LoginCredentials, RegisterData } from '../types/auth.types';
import { authApi } from '../api/auth';
import { toast } from 'sonner';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  role: UserRole | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  checkAuth: () => Promise<void>;
}

/** Hydrate auth from localStorage synchronously at module load (before first render). */
function hydrateAuth(): Pick<AuthState, 'user' | 'token' | 'isAuthenticated' | 'role'> {
  if (typeof window === 'undefined') {
    return { user: null, token: null, isAuthenticated: false, role: null };
  }
  const token = localStorage.getItem('auth_token');
  const userStr = localStorage.getItem('auth_user');
  if (!token || !userStr) {
    return { user: null, token: null, isAuthenticated: false, role: null };
  }
  try {
    const user = JSON.parse(userStr) as User;
    return { user, token, isAuthenticated: true, role: user.role };
  } catch {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    return { user: null, token: null, isAuthenticated: false, role: null };
  }
}

const initialState = hydrateAuth();

export const useAuthStore = create<AuthState>()((set, get) => ({
      ...initialState,
      isLoading: false,

      login: async (credentials: LoginCredentials) => {
        try {
          set({ isLoading: true });
          const response = await authApi.login(credentials);
          
          // Handle different response structures
          // API might return { message, data: { user, token } } or { user, token } directly
          const user = response.data?.user || response.user;
          const token = response.data?.token || response.token;

          if (!user || !token) {
            console.error('Invalid login response structure:', response);
            throw new Error('Invalid response from server. Please try again.');
          }

          localStorage.setItem('auth_token', token);
          localStorage.setItem('auth_user', JSON.stringify(user));

          set({
            user,
            token,
            isAuthenticated: true,
            role: user.role,
            isLoading: false,
          });

          toast.success('Login successful!');
        } catch (error: any) {
          set({ isLoading: false });
          const errorMessage = error.message || 'Login failed. Please try again.';
          toast.error(errorMessage);
          throw error;
        }
      },

      register: async (data: RegisterData) => {
        try {
          set({ isLoading: true });
          const response = await authApi.register(data);
          
          // Handle different response structures
          // API might return { message, data: { user, token } } or { user, token } directly
          const user = response.data?.user || response.user;
          const token = response.data?.token || response.token;

          if (!user || !token) {
            console.error('Invalid registration response structure:', response);
            throw new Error('Invalid response from server. Please try again.');
          }

          localStorage.setItem('auth_token', token);
          localStorage.setItem('auth_user', JSON.stringify(user));

          set({
            user,
            token,
            isAuthenticated: true,
            role: user.role,
            isLoading: false,
          });

          toast.success('Registration successful!');
        } catch (error: any) {
          set({ isLoading: false });
          const errorMessage = error.message || 'Registration failed. Please try again.';
          toast.error(errorMessage);
          throw error;
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch (error) {
          // Continue with logout even if API call fails
        } finally {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            role: null,
          });
          toast.success('Logged out successfully');
        }
      },

      updateProfile: async (data: Partial<User>) => {
        try {
          set({ isLoading: true });
          const updatedUser = await authApi.updateProfile(data);
          set({ user: updatedUser, isLoading: false });
          localStorage.setItem('auth_user', JSON.stringify(updatedUser));
          toast.success('Profile updated successfully!');
        } catch (error: any) {
          set({ isLoading: false });
          toast.error(error.message || 'Failed to update profile.');
          throw error;
        }
      },

      checkAuth: async () => {
        const token = localStorage.getItem('auth_token');
        const userStr = localStorage.getItem('auth_user');
        if (!token || !userStr) return;

        try {
          const currentUser = await authApi.getProfile();
          set({ user: currentUser, role: currentUser.role });
          localStorage.setItem('auth_user', JSON.stringify(currentUser));
        } catch (error: unknown) {
          const err = error as { response?: { status?: number } };
          const status = err.response?.status;

          // Only clear auth on 401 (token invalid/expired). Keep user logged in on 404/5xx/network.
          if (status === 401) {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              role: null,
            });
          } else if (status === 404) {
            console.warn('User profile endpoint not found (404). Add GET /api/v1/user in your Laravel API.');
          }
        }
      },
    })
);
