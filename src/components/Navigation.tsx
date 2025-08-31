"use client";

import React from 'react';
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
          ? 'bg-blue-500 text-white'
          : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
      }`}
    >
      {children}
    </Link>
  );
};

export default function Navigation() {
  const pathname = usePathname();
  
  // Only show navigation in teacher or authenticated routes
  if (!pathname.includes('/teacher') && !pathname.includes('/auth')) {
    return null;
  }

  return (
    <header className="bg-slate-800/90 border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href="/" className="text-xl font-semibold text-white">
                RealTimeQuiz
              </Link>
            </div>
          </div>
          
          {pathname.includes('/teacher') && (
            <nav className="flex space-x-2">
              <NavLink href="/teacher" exact>Dashboard</NavLink>
              <NavLink href="/teacher/session">Monitor Session</NavLink>
              <NavLink href="/teacher/results">Past Results</NavLink>
            </nav>
          )}
          
          <div>
            {pathname.includes('/teacher') && (
              <button className="px-3 py-1 text-sm border border-slate-600 rounded-md text-slate-300 hover:bg-slate-700">
                Sign Out
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
