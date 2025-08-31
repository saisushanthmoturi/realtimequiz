"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  exact?: boolean;
}

const NavLink: React.FC<NavLinkProps> = ({ href, children, exact = false }) => {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`px-4 py-2 rounded-md transition-colors ${
        isActive
          ? 'bg-blue-600 text-white'
          : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
      }`}
    >
      {children}
    </Link>
  );
};

export default function TeacherNavigation() {
  return (
    <div className="bg-slate-800/90 border-b border-slate-700 mb-6">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex-shrink-0">
            <Link href="/teacher" className="text-xl font-semibold text-white">
              RealTimeQuiz
            </Link>
          </div>
          
          <nav className="hidden md:flex space-x-1">
            <NavLink href="/teacher" exact>Dashboard</NavLink>
            <NavLink href="/teacher/session">Session Monitor</NavLink>
            <NavLink href="/teacher/results">Results</NavLink>
          </nav>
          
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 text-sm border border-slate-600 rounded-md text-slate-300 hover:bg-slate-700/50">
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
