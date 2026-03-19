import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANT_MAP: Record<Variant, string> = {
  primary:
    'bg-blue-600 hover:bg-blue-700 text-white border-transparent disabled:bg-blue-800 disabled:opacity-60',
  secondary:
    'bg-gray-700 hover:bg-gray-600 text-white border-gray-600 disabled:opacity-50',
  danger:
    'bg-red-700 hover:bg-red-800 text-white border-transparent disabled:opacity-50',
  ghost:
    'bg-transparent hover:bg-gray-800 text-gray-300 hover:text-white border-gray-700 disabled:opacity-50',
};

const SIZE_MAP: Record<Size, string> = {
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-3.5 py-1.5 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 font-medium rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-gray-900 ${VARIANT_MAP[variant]} ${SIZE_MAP[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
