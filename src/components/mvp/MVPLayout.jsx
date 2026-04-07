import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { Brain, Target, Home, BarChart2, Users, LogOut, Menu, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Role detection helpers
export const getMVPRole = (appRole) => {
  if (!appRole) return null;
  if (appRole === 'User Level 1' || appRole === 'User Level 2') return 'manager';
  if (appRole === 'Admin Level 1' || appRole === 'Admin Level 2' || appRole === 'Super Administrator') return 'buyer';
  if (appRole === 'Analyst') return 'executive';
  return null; // Non-MVP roles fall through to existing layout
};

const NAV_CONFIG = {
  manager: [
    { label: 'My Leadership', path: '/my-leadership', icon: Home },
    { label: 'My Goals', path: '/Performance', icon: Target },
    { label: 'Ask Atreus', path: '/ask-atreus', icon: Brain },
  ],
  buyer: [
    { label: 'Program Overview', path: '/program-overview', icon: Users },
    { label: 'Export / Report', path: '/ReportBuilder', icon: BarChart2 },
  ],
  executive: [
    { label: 'Leadership Intelligence', path: '/leadership-intelligence', icon: BarChart2 },
  ],
};

const ROLE_LABELS = {
  manager: 'Manager',
  buyer: 'HR / L&D',
  executive: 'Executive',
};

const ROLE_COLORS = {
  manager: 'bg-blue-50 border-blue-100',
  buyer: 'bg-purple-50 border-purple-100',
  executive: 'bg-emerald-50 border-emerald-100',
};

export default function MVPLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const mvpRole = getMVPRole(user?.app_role);
  const navItems = NAV_CONFIG[mvpRole] || [];

  const handleLogout = () => {
    base44.auth.logout();
  };

  const NavLinks = () => (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              isActive
                ? 'bg-[#0202ff] text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {item.label}
            {isActive && <ChevronRight className="w-3 h-3 ml-auto" />}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 fixed inset-y-0 left-0 z-20">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/be036d547_CuriosityLedIcon_20241030_085533_0000.png"
            alt="Curiosity Led"
            className="w-8 h-8 object-contain"
          />
          <div>
            <p className="text-sm font-bold text-gray-900">Curiosity Led</p>
            <p className="text-xs text-gray-400">Leadership Development</p>
          </div>
        </div>

        {/* Role badge */}
        {mvpRole && (
          <div className={`mx-3 mt-3 px-3 py-2 rounded-lg border text-xs font-medium text-center ${ROLE_COLORS[mvpRole]}`}>
            {ROLE_LABELS[mvpRole]} View
          </div>
        )}

        <NavLinks />

        {/* User footer */}
        <div className="border-t border-gray-100 px-3 py-3">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-[#0202ff]/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-[#0202ff]">
                {user?.full_name?.[0] || user?.email?.[0] || '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">{user?.full_name || user?.email}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleLogout} title="Log out">
              <LogOut className="w-3.5 h-3.5 text-gray-400" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/be036d547_CuriosityLedIcon_20241030_085533_0000.png"
            alt="Curiosity Led"
            className="w-7 h-7 object-contain"
          />
          <span className="text-sm font-bold text-gray-900">Curiosity Led</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg hover:bg-gray-100">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-20 bg-black/40" onClick={() => setMobileOpen(false)}>
          <div className="absolute top-14 left-0 right-0 bg-white border-b border-gray-200 shadow-lg p-4" onClick={e => e.stopPropagation()}>
            {mvpRole && (
              <div className={`mb-3 px-3 py-2 rounded-lg border text-xs font-medium text-center ${ROLE_COLORS[mvpRole]}`}>
                {ROLE_LABELS[mvpRole]} View
              </div>
            )}
            <NavLinks />
            <div className="border-t border-gray-100 pt-3 mt-1">
              <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-gray-500 px-3 py-2">
                <LogOut className="w-4 h-4" /> Log out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 md:ml-64 pt-14 md:pt-0 min-h-screen">
        {children}
      </main>
    </div>
  );
}