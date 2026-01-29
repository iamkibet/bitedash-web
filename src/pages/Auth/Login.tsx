import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { loginSchema } from '../../utils/validators';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card } from '../../components/common/Card';
import type { LoginCredentials } from '../../types/auth.types';
import type { UserRole } from '../../types/auth.types';

function getDashboardPath(role: UserRole | null): string {
  switch (role) {
    case 'customer':
      return '/stores';
    case 'restaurant':
      return '/store/dashboard';
    case 'rider':
      return '/rider/dashboard';
    case 'admin':
      return '/admin/dashboard';
    default:
      return '/stores';
  }
}

export const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading } = useAuthStore();
  const [formError, setFormError] = useState<string | null>(null);
  
  // Get returnTo from location state (for redirecting after login)
  const returnTo = (location.state as { returnTo?: string })?.returnTo;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginCredentials>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginCredentials) => {
    setFormError(null);
    try {
      await login(data);
      const role = useAuthStore.getState().role;
      // Redirect to returnTo if provided, otherwise to dashboard
      navigate(returnTo || getDashboardPath(role));
    } catch (err: unknown) {
      const e = err as { message?: string };
      const msg = e?.message || 'Login failed. Please try again.';
      setFormError(msg);
      console.error('Login error:', e);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh] py-12">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>
          <p className="mt-2 text-gray-600">Sign in to your BiteDash account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {formError && (
            <div
              role="alert"
              className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800"
            >
              {formError}
            </div>
          )}
          <Input
            label="Email"
            type="email"
            {...register('email')}
            error={errors.email?.message}
            placeholder="you@example.com"
          />

          <Input
            label="Password"
            type="password"
            {...register('password')}
            error={errors.password?.message}
            placeholder="••••••••"
          />

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Sign In
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
};
