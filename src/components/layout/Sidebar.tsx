'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard/jobs', label: 'Oferty pracy', icon: '🔍' },
  { href: '/dashboard/employers', label: 'Lista e-mail', icon: '📋' },
  { href: '/dashboard/admin', label: 'Admin', icon: '⚙️' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 flex-shrink-0 bg-gray-950 border-r border-gray-800 flex flex-col h-full">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-gray-800">
        <span className="text-white font-bold text-base tracking-tight">
          🧊 Iceland Jobs
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {NAV_ITEMS.map(item => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-gray-800">
        <p className="text-gray-600 text-xs">v1.0 · Iceland Job Hunter</p>
      </div>
    </aside>
  );
}
