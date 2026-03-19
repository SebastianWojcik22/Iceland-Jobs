import type { PairStatus } from '@/types';

const CONFIG: Record<PairStatus, { label: string; className: string }> = {
  yes: {
    label: '👥 Dla pary: Tak',
    className: 'bg-green-900/60 text-green-300 border-green-700',
  },
  maybe: {
    label: '👥 Dla pary: Może',
    className: 'bg-yellow-900/60 text-yellow-300 border-yellow-700',
  },
  unknown: {
    label: '👥 Dla pary: Nieznane',
    className: 'bg-gray-700/60 text-gray-400 border-gray-600',
  },
  no: {
    label: '👥 Dla pary: Brak',
    className: 'bg-gray-700/60 text-gray-400 border-gray-600',
  },
};

interface Props {
  status: PairStatus;
}

export function PairBadge({ status }: Props) {
  const { label, className } = CONFIG[status];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${className}`}
    >
      {label}
    </span>
  );
}
