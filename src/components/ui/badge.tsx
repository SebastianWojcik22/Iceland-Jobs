interface BadgeProps {
  label: string;
  color?: 'green' | 'yellow' | 'red' | 'gray' | 'blue' | 'purple';
  className?: string;
}

const COLOR_MAP: Record<NonNullable<BadgeProps['color']>, string> = {
  green: 'bg-green-900/60 text-green-300 border-green-700',
  yellow: 'bg-yellow-900/60 text-yellow-300 border-yellow-700',
  red: 'bg-red-900/60 text-red-300 border-red-700',
  gray: 'bg-gray-700/60 text-gray-300 border-gray-600',
  blue: 'bg-blue-900/60 text-blue-300 border-blue-700',
  purple: 'bg-purple-900/60 text-purple-300 border-purple-700',
};

export function Badge({ label, color = 'gray', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${COLOR_MAP[color]} ${className}`}
    >
      {label}
    </span>
  );
}
