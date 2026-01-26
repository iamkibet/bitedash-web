import { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg' | 'none';
}

export const Card = ({ children, className, padding = 'md' }: CardProps) => {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    none: '',
  };

  return (
    <div
      className={cn(
        'bg-white rounded-lg shadow-md',
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </div>
  );
};
