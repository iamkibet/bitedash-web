import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { registerSchema } from '../../utils/validators';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card } from '../../components/common/Card';
import type { RegisterData } from '../../types/auth.types';
import { useState } from 'react';

type ApiValidationErrors = Record<string, string[]>;

function getDashboardPath(role: 'customer' | 'restaurant' | 'rider'): string {
  switch (role) {
    case 'customer':
      return '/stores';
    case 'restaurant':
      return '/store/dashboard';
    case 'rider':
      return '/rider/orders';
    default:
      return '/stores';
  }
}

export const Register = () => {
  const navigate = useNavigate();
  const { register: registerUser, isLoading } = useAuthStore();
  const [selectedRole, setSelectedRole] = useState<'customer' | 'restaurant' | 'rider'>('customer');
  const [formError, setFormError] = useState<string | null>(null);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    setError,
  } = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'customer',
    },
  });

  const onSubmit = async (data: RegisterData) => {
    setFormError(null);
    try {
      await registerUser({ ...data, role: selectedRole });
      navigate(getDashboardPath(selectedRole));
    } catch (err: unknown) {
      const error = err as { message?: string; validationErrors?: ApiValidationErrors };
      console.error('Registration error:', error);
      const validationErrors = error?.validationErrors;
      const knownFields: (keyof RegisterData)[] = [
        'name',
        'email',
        'phone',
        'password',
        'password_confirmation',
        'role',
      ];
      if (validationErrors && typeof validationErrors === 'object' && Object.keys(validationErrors).length > 0) {
        knownFields.forEach((field) => {
          const messages = validationErrors[field];
          if (messages?.length) {
            setError(field, { type: 'server', message: messages[0] });
          }
        });
      } else {
        setFormError(error?.message || 'Registration failed. Please try again.');
      }
    }
  };

  const handleRoleChange = (role: 'customer' | 'restaurant' | 'rider') => {
    setSelectedRole(role);
    setValue('role', role);
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh] py-12">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Create an account</h2>
          <p className="mt-2 text-gray-600">Join BiteDash today</p>
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
            label="Full Name"
            type="text"
            {...register('name')}
            error={errors.name?.message}
            placeholder="John Doe"
          />

          <Input
            label="Email"
            type="email"
            {...register('email')}
            error={errors.email?.message}
            placeholder="you@example.com"
          />

          <Input
            label="Phone Number"
            type="tel"
            {...register('phone')}
            error={errors.phone?.message}
            placeholder="+254712345678"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              I want to register as:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['customer', 'restaurant', 'rider'] as const).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleRoleChange(role)}
                  className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                    selectedRole === role
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </button>
              ))}
            </div>
            {errors.role && (
              <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
            )}
          </div>

          <Input
            label="Password"
            type="password"
            {...register('password')}
            error={errors.password?.message}
            placeholder="••••••••"
          />

          <Input
            label="Confirm Password"
            type="password"
            {...register('password_confirmation')}
            error={errors.password_confirmation?.message}
            placeholder="••••••••"
          />

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Sign Up
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
};
