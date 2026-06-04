import React, { useState, useEffect, createContext, useContext } from "react";

export const SidebarContext = createContext({ collapsed: false });
export const useSidebar = () => useContext(SidebarContext);

import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import {
  Brain, Target, Home, BarChart2, Users, LogOut, Menu, X,
  ChevronRight, ChevronLeft, Bell, User, ArrowLeft,
  Settings, Shield, UserCog, TrendingUp, Dumbbell, Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";
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
  { label: 'Lead', path: '/today', icon: Home },
  { label: 'Patterns', path: '/patterns', icon: TrendingUp },
  { label: 'Practice', path: '/practice', icon: Dumbbell },
  { label: 'You', path: '/you', icon: User }],

  buyer: [
  { label: 'Leadership Intelligence', path: '/Insights?tab=org', icon: Brain },
  { label: 'Development Manager', path: '/DevelopmentManager', icon: Users },
  { label: 'Goal Manager', path: '/GoalManager', icon: Target },
  { label: 'Report Builder', path: '/report-builder-mvp', icon: BarChart2 },
  { label: 'User Management', path: '/UserManagement', icon: UserCog }],

  analyst: [
  { label: 'Leadership Intelligence', path: '/Insights?tab=org', icon: Brain },
  { label: 'Goal Manager', path: '/GoalManager', icon: Target },
  { label: 'Report Builder', path: '/report-builder-mvp', icon: BarChart2 }],

  executive: [
  { label: 'Leadership Intelligence', path: '/Insights?tab=org', icon: Brain },
  { label: 'Report Builder', path: '/report-builder-mvp', icon: BarChart2 }]

};

const ROLE_LABELS = { manager: 'Manager', buyer: 'Administrator', analyst: 'Analyst', executive: 'Enterprise' };
const ROLE_COLORS = {
  manager: 'bg-[#0202ff]/10 border-[#0202ff]/20 text-[#6699ff]',
  buyer: 'bg-violet-500/10 border-violet-500/20 text-violet-400',
  analyst: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
  executive: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
};

function MVPLayoutInner({ children }) {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
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

  // Determine if current page is a "sub-page" (not a core nav root)
  const coreNavPaths = navItems.map(i => i.path.split('?')[0]);
  const isSubPage = !coreNavPaths.includes(location.pathname) &&
    location.pathname !== '/' &&
    location.pathname !== '/my-leadership';

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
    const isActive = location.pathname === itemPath ||
      (itemPath === '/today' && (location.pathname === '/my-leadership' || location.pathname === '/')) ||
      (itemPath === '/you' && ['/Profile', '/Settings', '/PrivacySettings', '/Notifications', '/teams-settings'].includes(location.pathname));
    const [navPathname, navSearch] = item.path.split('?');
    return (
      <Link
        to={{ pathname: navPathname, search: navSearch ? `?${navSearch}` : '' }}
        onClick={() => setMobileOpen(false)}
        title={!showLabel ? item.label : undefined}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
        isActive ?
        'bg-[#0202ff] text-white shadow-sm' :
        ''} ${!showLabel ? 'justify-center' : ''}`}
        style={!isActive ? { color: 'hsl(var(--muted-foreground))' } : {}}
        onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'hsl(var(--muted))'; e.currentTarget.style.color = 'hsl(var(--foreground))'; }}}
        onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'hsl(var(--muted-foreground))'; }}}>
        
        <Icon className="w-4 h-4 flex-shrink-0" />
        {showLabel && <span className="flex-1">{item.label}</span>}
        {showLabel && isActive && <ChevronRight className="w-3 h-3" />}
      </Link>);

  };

  const sidebarWidth = collapsed ? 'w-16' : 'w-64';

  // Sidebar surface tokens (CSS vars adapt to theme)
  const sidebarBg = 'hsl(var(--sidebar-background))';
  const sidebarBorder = '1px solid hsl(var(--sidebar-border))';
  const headerBg = 'hsl(var(--card))';

  return (
    <SidebarContext.Provider value={{ collapsed }}>
    <div className={`${isDark ? 'cl-dark' : ''} min-h-screen flex bg-background`}>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col ${sidebarWidth} fixed inset-y-0 left-0 z-20 transition-all duration-200`}
        style={{ background: sidebarBg, borderRight: sidebarBorder }}
      >
        {/* Logo + Collapse Toggle */}
        <div
          className={`flex items-center h-16 px-3 ${collapsed ? 'justify-center' : 'justify-between px-4'}`}
          style={{ borderBottom: sidebarBorder }}
        >
          {!collapsed &&
          <div className="flex items-center gap-2 min-w-0">
              <img
              src={isDark ? "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/46e2410c8_Untitleddesign.png" : "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/be036d547_CuriosityLedIcon_20241030_085533_0000.png"}
              alt="Curiosity Led"
              className="w-9 h-9 object-contain flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-bold truncate text-foreground">Curiosity Led</p>
              </div>
            </div>
          }
          {collapsed &&
          <img
            src={isDark ? "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/46e2410c8_Untitleddesign.png" : "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/be036d547_CuriosityLedIcon_20241030_085533_0000.png"}
            alt="Curiosity Led"
            className="w-8 h-8 object-contain" />
          }
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg flex-shrink-0 transition-colors"
            style={collapsed
              ? { position: 'absolute', right: 0, transform: 'translateX(50%)', background: sidebarBg, border: sidebarBorder, color: 'hsl(220 8% 48%)' }
              : { color: 'hsl(220 8% 48%)' }
            }
          >
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
        <div className="p-2" style={{ borderTop: sidebarBorder }}>
          {!collapsed ?
          <div className="flex items-center gap-1 px-2 py-2 rounded-lg">
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'hsl(var(--primary)/0.15)' }}>
                <span className="text-xs font-bold" style={{ color: 'hsl(var(--ring))' }}>
                  {(user?.display_name || user?.data?.display_name || user?.full_name)?.[0] || user?.email?.[0] || '?'}
                </span>
              </div>
              <div className="flex-1 min-w-0 px-1">
                <p className="text-xs font-medium truncate" style={{ color: 'hsl(var(--foreground))' }}>{user?.display_name || user?.data?.display_name || user?.full_name || user?.email}</p>
              </div>
              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="h-7 w-7 flex items-center justify-center rounded-lg transition-colors flex-shrink-0"
                style={{ color: 'hsl(var(--muted-foreground))' }}
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </button>
              {/* Notifications */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 relative" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    <Bell className="w-3.5 h-3.5" />
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
                    {unreadCount > 0 && <p className="text-xs text-muted-foreground">{unreadCount} unread</p>}
                  </div>
                  {recentNotifications.length === 0 ?
                <div className="px-3 py-6 text-center text-muted-foreground text-sm">No notifications yet</div> :
                recentNotifications.map((n) =>
                <DropdownMenuItem key={n.id} onClick={() => handleNotificationClick(n.id)} className="px-3 py-2.5 cursor-pointer">
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${!n.is_read ? '' : 'text-muted-foreground'}`}>{n.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{n.message}</p>
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
                  <Button variant="ghost" size="icon" className="h-7 w-7" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    <User className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="end" className="w-56">
                  <div className="px-3 py-2">
                    <p className="text-sm font-semibold">{user?.display_name || user?.data?.display_name || user?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                    <Badge variant="outline" className="text-xs mt-1">{user?.data?.current_role || user?.current_role || getFriendlyRoleLabel(user?.app_role)}</Badge>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/Profile')} className="cursor-pointer"><User className="w-4 h-4 mr-2" /> My Profile</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/Settings')} className="cursor-pointer"><Settings className="w-4 h-4 mr-2" /> Settings</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/PrivacySettings')} className="cursor-pointer"><Shield className="w-4 h-4 mr-2" /> Privacy & Security</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-500"><LogOut className="w-4 h-4 mr-2" /> Log Out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div> :
          <div className="flex flex-col items-center gap-1">
              <button
                onClick={toggleTheme}
                className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
                style={{ color: 'hsl(var(--muted-foreground))' }}
                title={isDark ? 'Light mode' : 'Dark mode'}
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-9 h-9 relative" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 &&
                  <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-[#0202ff] text-white text-[9px] flex items-center justify-center font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                  }
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="end" className="w-72">
                  <div className="px-3 py-2 border-b"><p className="font-semibold text-sm">Notifications</p></div>
                  {recentNotifications.length === 0 ?
                <div className="px-3 py-4 text-center text-muted-foreground text-sm">No notifications yet</div> :
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
                  <Button variant="ghost" size="icon" className="w-9 h-9" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    <User className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="end" className="w-56">
                  <div className="px-3 py-2">
                    <p className="text-sm font-semibold">{user?.display_name || user?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/Profile')} className="cursor-pointer"><User className="w-4 h-4 mr-2" /> My Profile</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/Settings')} className="cursor-pointer"><Settings className="w-4 h-4 mr-2" /> Settings</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/PrivacySettings')} className="cursor-pointer"><Shield className="w-4 h-4 mr-2" /> Privacy & Security</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-500"><LogOut className="w-4 h-4 mr-2" /> Log Out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          }
        </div>
      </aside>

      {/* Mobile Header */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 h-14"
        style={{ background: headerBg, borderBottom: sidebarBorder }}
      >
        <div className="flex items-center gap-2">
          {isSubPage ? (
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 p-1.5 -ml-1 rounded-lg transition-colors"
              style={{ color: 'hsl(var(--muted-foreground))' }}
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back</span>
            </button>
          ) : (
            <>
              <img
                src={isDark ? "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/46e2410c8_Untitleddesign.png" : "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/be036d547_CuriosityLedIcon_20241030_085533_0000.png"}
                alt="Curiosity Led"
                className="w-8 h-8 object-contain" />
              <span className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>Curiosity Led</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'hsl(var(--muted-foreground))' }}
            title={isDark ? 'Light mode' : 'Dark mode'}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'hsl(var(--muted-foreground))' }}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileOpen &&
      <div className="md:hidden fixed inset-0 z-20 bg-black/60" onClick={() => setMobileOpen(false)}>
          <div
            className="absolute top-14 left-0 right-0 shadow-lg p-4"
            style={{ background: headerBg, borderBottom: sidebarBorder }}
            onClick={(e) => e.stopPropagation()}
          >
            {mvpRole &&
          <div className={`mb-3 px-3 py-2 rounded-lg border text-xs font-medium text-center ${ROLE_COLORS[mvpRole]}`}>
                {ROLE_LABELS[mvpRole]} View
              </div>
          }
            <nav className="space-y-1">
              {navItems.map((item) => <NavItem key={item.path} item={item} />)}
            </nav>
            <div className="pt-3 mt-3" style={{ borderTop: sidebarBorder }}>
              <button onClick={handleLogout} className="flex items-center gap-2 text-sm px-3 py-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
                <LogOut className="w-4 h-4" /> Log out
              </button>
            </div>
          </div>
        </div>
      }

      {/* Main content */}
      <main className={`flex-1 ${collapsed ? 'md:ml-16' : 'md:ml-64'} pt-14 md:pt-0 min-h-screen transition-all duration-200`}>
        {isSubPage && (
          <div className="hidden md:flex items-center px-6 pt-5 pb-1">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-sm font-medium transition-colors rounded-lg px-2 py-1.5 -ml-2"
              style={{ color: 'hsl(var(--muted-foreground))' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'hsl(var(--foreground))'; e.currentTarget.style.background = 'hsl(var(--muted))'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'hsl(var(--muted-foreground))'; e.currentTarget.style.background = ''; }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>
        )}
        {children}
      </main>

      {/* Floating Atreus Button — always accessible */}
      {!showAtreus &&
      <button
        onClick={() => { clearPending(); openAtreusDefault(); }}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full transition-all flex items-center justify-center"
        style={{ backgroundColor: '#0202ff', boxShadow: '0 4px 20px rgba(2,2,255,0.35)' }}
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