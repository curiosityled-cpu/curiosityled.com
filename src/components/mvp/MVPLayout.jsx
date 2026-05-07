import React, { useState, useEffect, createContext, useContext } from "react";

export const SidebarContext = createContext({ collapsed: false });
export const useSidebar = () => useContext(SidebarContext);

import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import {
  Brain, Target, Home, BarChart2, Users, LogOut, Menu, X,
  ChevronRight, ChevronLeft, BarChart3, Map, Bell, User,
  Settings, Shield, BookOpen } from
"lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AtreusCoach from "@/components/ai/AtreusCoach";
import { AuthProvider as FullAuthProvider } from "@/components/useAuth";
import { AtreusProvider, useAtreusChat } from "@/components/ai/AtreusContext";
import { createPageUrl } from "@/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger } from
"@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

// Role detection helpers
export const getMVPRole = (appRole) => {
  if (!appRole) return null;
  if (appRole === 'User Level 1' || appRole === 'User Level 2') return 'manager';
  if (appRole === 'Admin Level 1' || appRole === 'Admin Level 2' || appRole === 'Super Administrator' || appRole === 'Platform Admin' || appRole === 'Partner Business Administrator' || appRole === 'admin') return 'buyer';
  if (appRole === 'Analyst') return 'analyst';
  if (appRole === 'Executive') return 'executive';
  return null;
};

// Friendly display labels for app roles (shown to end users)
export const getFriendlyRoleLabel = (appRole) => {
  const labels = {
    'User Level 1': 'User',
    'User Level 2': 'Team Leader',
    'Analyst': 'Analyst',
    'Executive': 'Executive',
    'Admin Level 1': 'Program Admin',
    'Admin Level 2': 'HR Admin',
    'Super Administrator': 'Super Administrator',
    'Partner Business Administrator': 'Partner Administrator',
    'Platform Admin': 'Platform Admin',
  };
  return labels[appRole] || appRole || 'User';
};

const NAV_CONFIG = {
  manager: [
  { label: 'My Leadership', path: '/my-leadership', icon: Home },
  { label: 'My Goals', path: '/my-goals', icon: Target },
  { label: 'My Development', path: '/my-development', icon: BookOpen }],

  buyer: [
  { label: 'Experience Management', path: '/experience-overview', icon: Users },
  { label: 'Leadership Intelligence', path: '/Insights?tab=org', icon: BarChart3 },
  { label: 'Report Builder', path: '/report-builder-mvp', icon: BarChart2 },
  { label: 'User Management', path: '/UserManagement', icon: Shield }],

  analyst: [
  { label: 'Leadership Intelligence', path: '/Insights?tab=org', icon: BarChart3 },
  { label: 'Report Builder', path: '/report-builder-mvp', icon: BarChart2 }],

  executive: [
  { label: 'Leadership Intelligence', path: '/Insights?tab=org', icon: BarChart3 },
  { label: 'Report Builder', path: '/report-builder-mvp', icon: BarChart2 }]

};

const ROLE_LABELS = { manager: 'Manager', buyer: 'HR / L&D', analyst: 'Analyst', executive: 'Enterprise' };
const ROLE_COLORS = {
  manager: 'bg-blue-50 border-blue-100 text-blue-700',
  buyer: 'bg-purple-50 border-purple-100 text-purple-700',
  analyst: 'bg-indigo-50 border-indigo-100 text-indigo-700',
  executive: 'bg-emerald-50 border-emerald-100 text-emerald-700'
};

function MVPLayoutInner({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { isOpen: showAtreus, pendingContext, draftMessage, close: closeAtreus, clearPending, openWithContext } = useAtreusChat();
  const openAtreusDefault = () => openWithContext({});
  const [recentNotifications, setRecentNotifications] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.email) return;
    const fetchNotifications = async () => {
      try {
        const [unread, recent] = await Promise.all([
        base44.entities.Notification.filter({ user_email: user.email, is_read: false }, '-scheduled_for'),
        base44.entities.Notification.filter({ user_email: user.email }, '-scheduled_for', 5)]
        );
        setUnreadCount(unread.length);
        setRecentNotifications(recent);
      } catch {}
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [user?.email]);

  const handleNotificationClick = (id) => {
    if (id) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setRecentNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
      base44.entities.Notification.update(id, { is_read: true }).catch(() => {});
    }
    navigate('/Notifications');
  };

  const mvpRole = getMVPRole(user?.app_role || user?.data?.app_role);
  const navItems = NAV_CONFIG[mvpRole] || [];

  const handleLogout = () => base44.auth.logout();

  const atreusContext = {
    pageType: location.pathname.replace('/', '') || 'dashboard',
    userRole: user?.app_role,
    mvpRole,
    userEmail: user?.email,
    user_name: user?.display_name || user?.data?.display_name || user?.full_name || user?.email,
    user_email: user?.email,
    path: location.pathname
  };

  const NavItem = ({ item, showLabel = true }) => {
    const Icon = item.icon;
    const itemPath = item.path.split('?')[0].split('#')[0];
    const isActive = location.pathname === itemPath;
    const [navPathname, navSearch] = item.path.split('?');
    return (
      <Link
        to={{ pathname: navPathname, search: navSearch ? `?${navSearch}` : '' }}
        onClick={() => setMobileOpen(false)}
        title={!showLabel ? item.label : undefined}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
        isActive ?
        'bg-[#0202ff] text-white shadow-sm' :
        'text-gray-600 hover:bg-gray-100 hover:text-gray-900'} ${
        !showLabel ? 'justify-center' : ''}`}>
        
        <Icon className="w-4 h-4 flex-shrink-0" />
        {showLabel && <span className="flex-1">{item.label}</span>}
        {showLabel && isActive && <ChevronRight className="w-3 h-3" />}
      </Link>);

  };

  const sidebarWidth = collapsed ? 'w-16' : 'w-64';

  return (
    <SidebarContext.Provider value={{ collapsed }}>
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col ${sidebarWidth} bg-white border-r border-gray-200 fixed inset-y-0 left-0 z-20 transition-all duration-200`}>
        {/* Logo + Collapse Toggle */}
        <div className={`flex items-center border-b border-gray-100 h-16 px-3 ${collapsed ? 'justify-center' : 'justify-between px-4'}`}>
          {!collapsed &&
          <div className="flex items-center gap-2 min-w-0">
              <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/be036d547_CuriosityLedIcon_20241030_085533_0000.png"
              alt="Curiosity Led"
              className="w-7 h-7 object-contain flex-shrink-0" />
            
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">Curiosity Led</p>
                
              </div>
            </div>
          }
          {collapsed &&
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/be036d547_CuriosityLedIcon_20241030_085533_0000.png"
            alt="Curiosity Led"
            className="w-7 h-7 object-contain" />

          }
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 ${collapsed ? 'absolute right-0 translate-x-1/2 bg-white border border-gray-200 shadow-sm' : ''}`}>
            
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Role badge */}
        {mvpRole && !collapsed &&
        <div className={`mx-3 mt-3 px-3 py-1.5 rounded-lg border text-xs font-medium text-center ${ROLE_COLORS[mvpRole]}`}>
            {ROLE_LABELS[mvpRole]} View
          </div>
        }

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map((item) =>
          <NavItem key={item.path} item={item} showLabel={!collapsed} />
          )}
        </nav>

        {/* User footer */}
        <div className="border-t border-gray-100 p-2">
          {!collapsed ?
          <div className="flex items-center gap-1 px-2 py-2 rounded-lg">
              <div className="w-7 h-7 rounded-full bg-[#0202ff]/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-[#0202ff]">
                  {(user?.display_name || user?.data?.display_name || user?.full_name)?.[0] || user?.email?.[0] || '?'}
                </span>
              </div>
              <div className="flex-1 min-w-0 px-1">
                <p className="text-xs font-medium text-gray-900 truncate">{user?.display_name || user?.data?.display_name || user?.full_name || user?.email}</p>
              </div>
              {/* Notifications */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 relative">
                    <Bell className="w-3.5 h-3.5 text-gray-400" />
                    {unreadCount > 0 &&
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#0202ff] text-white text-[9px] flex items-center justify-center font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                  }
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="end" className="w-72">
                  <div className="px-3 py-2 border-b">
                    <p className="font-semibold text-sm">Notifications</p>
                    {unreadCount > 0 && <p className="text-xs text-gray-500">{unreadCount} unread</p>}
                  </div>
                  {recentNotifications.length === 0 ?
                <div className="px-3 py-6 text-center text-gray-400 text-sm">No notifications yet</div> :

                recentNotifications.map((n) =>
                <DropdownMenuItem key={n.id} onClick={() => handleNotificationClick(n.id)} className="px-3 py-2.5 cursor-pointer">
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${!n.is_read ? 'text-gray-900' : 'text-gray-500'}`}>{n.title}</p>
                          <p className="text-xs text-gray-400 truncate">{n.message}</p>
                        </div>
                        {!n.is_read && <span className="w-2 h-2 rounded-full bg-[#0202ff] flex-shrink-0 ml-2" />}
                      </DropdownMenuItem>
                )
                }
                </DropdownMenuContent>
              </DropdownMenu>
              {/* Profile */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="end" className="w-56">
                  <div className="px-3 py-2">
                    <p className="text-sm font-semibold">{user?.display_name || user?.data?.display_name || user?.full_name}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                    <Badge variant="outline" className="text-xs mt-1">{getFriendlyRoleLabel(user?.app_role)}</Badge>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/Profile')} className="cursor-pointer">
                    <User className="w-4 h-4 mr-2" /> My Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/Settings')} className="cursor-pointer">
                    <Settings className="w-4 h-4 mr-2" /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/PrivacySettings')} className="cursor-pointer">
                    <Shield className="w-4 h-4 mr-2" /> Privacy & Security
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                    <LogOut className="w-4 h-4 mr-2" /> Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div> :

          <div className="flex flex-col items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-9 h-9 relative">
                    <Bell className="w-4 h-4 text-gray-400" />
                    {unreadCount > 0 &&
                  <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-[#0202ff] text-white text-[9px] flex items-center justify-center font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                  }
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="end" className="w-72">
                  <div className="px-3 py-2 border-b">
                    <p className="font-semibold text-sm">Notifications</p>
                  </div>
                  {recentNotifications.length === 0 ?
                <div className="px-3 py-4 text-center text-gray-400 text-sm">No notifications yet</div> :

                recentNotifications.map((n) =>
                <DropdownMenuItem key={n.id} onClick={() => handleNotificationClick(n.id)} className="px-3 py-2.5 cursor-pointer">
                        <p className="text-sm truncate">{n.title}</p>
                      </DropdownMenuItem>
                )
                }
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-9 h-9">
                    <User className="w-4 h-4 text-gray-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="end" className="w-56">
                  <div className="px-3 py-2">
                    <p className="text-sm font-semibold">{user?.display_name || user?.full_name}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/Profile')} className="cursor-pointer">
                    <User className="w-4 h-4 mr-2" /> My Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/Settings')} className="cursor-pointer">
                    <Settings className="w-4 h-4 mr-2" /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/PrivacySettings')} className="cursor-pointer">
                    <Shield className="w-4 h-4 mr-2" /> Privacy & Security
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                    <LogOut className="w-4 h-4 mr-2" /> Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          }
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/be036d547_CuriosityLedIcon_20241030_085533_0000.png"
            alt="Curiosity Led"
            className="w-7 h-7 object-contain" />
          
          <span className="text-sm font-bold text-gray-900">Curiosity Led</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg hover:bg-gray-100">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Menu */}
      {mobileOpen &&
      <div className="md:hidden fixed inset-0 z-20 bg-black/40" onClick={() => setMobileOpen(false)}>
          <div className="absolute top-14 left-0 right-0 bg-white border-b border-gray-200 shadow-lg p-4" onClick={(e) => e.stopPropagation()}>
            {mvpRole &&
          <div className={`mb-3 px-3 py-2 rounded-lg border text-xs font-medium text-center ${ROLE_COLORS[mvpRole]}`}>
                {ROLE_LABELS[mvpRole]} View
              </div>
          }
            <nav className="space-y-1">
              {navItems.map((item) => <NavItem key={item.path} item={item} />)}
            </nav>
            <div className="border-t border-gray-100 pt-3 mt-3">
              <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-gray-500 px-3 py-2">
                <LogOut className="w-4 h-4" /> Log out
              </button>
            </div>
          </div>
        </div>
      }

      {/* Main content */}
      <main className={`flex-1 ${collapsed ? 'md:ml-16' : 'md:ml-64'} pt-14 md:pt-0 min-h-screen transition-all duration-200`}>
        {children}
      </main>

      {/* Floating Atreus Button */}
      {!showAtreus &&
      <button
        onClick={() => { clearPending(); openAtreusDefault(); }}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
        style={{ backgroundColor: '#0202ff' }}
        title="Ask Atreus - Your AI Coach">
          <Brain className="w-6 h-6 text-white" />
        </button>
      }

      {/* Atreus Coach Panel — wrapped in full AuthProvider so AtreusCoach's useAuth works */}
      {showAtreus &&
      <FullAuthProvider>
          <AtreusCoach
          context={{ ...atreusContext, ...(pendingContext || {}) }}
          isMinimized={false}
          onMinimize={closeAtreus}
          onClose={closeAtreus}
          draftMessage={draftMessage} />
        
        </FullAuthProvider>
      }
    </div>
    </SidebarContext.Provider>);

}

export default function MVPLayout({ children }) {
  return (
    <AtreusProvider>
      <MVPLayoutInner>{children}</MVPLayoutInner>
    </AtreusProvider>
  );
}