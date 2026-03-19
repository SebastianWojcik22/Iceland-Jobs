import type { HousingStatus } from '@/types';

const CONFIG: Record<HousingStatus, { label: string; className: string }> = {
  yes: {
    label: '🏠 Zakwaterowanie: Tak',
    className: 'bg-green-900/60 text-green-300 border-green-700',
  },
  maybe: {
    label: '🏠 Zakwaterowanie: Może',
    className: 'bg-yellow-900/60 text-yellow-300 border-yellow-700',
  },
  unknown: {
    label: '🏠 Zakwaterowanie: Nieznane',
    className: 'bg-gray-700/60 text-gray-400 border-gray-600',
  },
  no: {
    label: '🏠 Zakwaterowanie: Brak',
    className: 'bg-red-900/40 text-red-400 border-red-800',
  },
};

interface Props {
  status: HousingStatus;
}

export function HousingBadge({ status }: Props) {
  const { label, className } = CONFIG[status];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${className}`}
    >
      {label}
    </span>
  );
}
