import React, { useState, useEffect, useRef } from "react";
import {
  LogOut,
  Menu,
  X,
  Search,
  Bell,
  CheckCircle2,
  Sparkles
} from "lucide-react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { Button } from "./ui/Button";
import { CopilotChat } from "./CopilotChat";

import { NAVIGATION_CATEGORIES, FEATURES, FEATURE_STATUS } from "../config/features";
import api from "../api/axios";

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Command Palette State
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [paletteIndex, setPaletteIndex] = useState(0);
  const paletteInputRef = useRef(null);

  // Notification Center State
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // Poll notifications every 10s
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcut listener for Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (commandPaletteOpen && paletteInputRef.current) {
      setTimeout(() => paletteInputRef.current?.focus(), 50);
    }
  }, [commandPaletteOpen]);

  const fetchNotifications = async () => {
    try {
      const res = await api.get("/notifications");
      const data = res.data.data || res.data;
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      // Gracefully handle unauthenticated/unreachable notifications
    }
  };

  const handleNotificationClick = async (n) => {
    try {
      if (!n.read) {
        await api.patch(`/notifications/${n._id || n.id}/read`);
        setNotifications((prev) =>
          prev.map((item) => ((item._id === n._id || item.id === n.id) ? { ...item, read: true } : item))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      if (n.actionUrl) {
        navigate(n.actionUrl);
        setNotificationsOpen(false);
      }
    } catch (err) {
      console.error("Error marking notification read:", err);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all notifications read:", err);
    }
  };

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  const filteredFeatures = FEATURES.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePaletteKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setPaletteIndex((prev) => (prev + 1) % Math.max(filteredFeatures.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setPaletteIndex((prev) => (prev - 1 + filteredFeatures.length) % Math.max(filteredFeatures.length, 1));
    } else if (e.key === "Enter" && filteredFeatures[paletteIndex]) {
      e.preventDefault();
      navigate(filteredFeatures[paletteIndex].to);
      setCommandPaletteOpen(false);
    } else if (e.key === "Escape") {
      setCommandPaletteOpen(false);
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border/60 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-sm shadow-2xs">
          C
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-text leading-tight tracking-tight">CareerPilot AI</span>
          <span className="text-[10px] font-semibold text-text-muted tracking-wider uppercase">Career Operating System</span>
        </div>
      </div>

      {/* Navigation Links Grouped by Category */}
      <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto" aria-label="Primary navigation">
        {NAVIGATION_CATEGORIES.map((cat, catIdx) => (
          <div key={cat.category || catIdx} className="space-y-1">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider px-2.5 block mb-1">
              {cat.category}
            </span>
            {cat.items.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to || (item.to !== "/dashboard" && location.pathname.startsWith(item.to));
              
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-primary-bg text-primary font-bold shadow-2xs"
                      : "text-text-secondary hover:bg-bg-secondary hover:text-text"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={16} className={isActive ? "text-primary" : "text-text-secondary"} aria-hidden="true" />
                    <span>{item.label}</span>
                  </div>
                  {item.status !== FEATURE_STATUS.WORKING && (
                    <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded ${
                      isActive ? "bg-primary/10 text-primary" : "bg-bg-secondary text-text-muted"
                    }`}>
                      Soon
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Logout Footer */}
      <div className="p-3 border-t border-border/60 shrink-0">
        <button
          className="flex items-center gap-2.5 px-2.5 py-2 w-full rounded-lg text-xs font-semibold text-text-secondary hover:text-danger hover:bg-danger-bg/50 transition-colors"
          type="button"
          onClick={handleLogout}
        >
          <LogOut size={16} aria-hidden="true" />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-bg font-sans overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-surface border-r border-border shrink-0 z-20 shadow-2xs">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-text/40 backdrop-blur-xs transition-opacity" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative flex flex-col w-64 max-w-[80%] bg-surface h-full shadow-lg">
            <button className="absolute top-4 right-4 p-1.5 text-text-secondary hover:bg-bg-secondary rounded-lg" onClick={() => setMobileMenuOpen(false)}>
              <X size={18} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-bg relative">
        {/* Top Header */}
        <header className="h-14 shrink-0 bg-surface border-b border-border flex items-center justify-between px-4 sm:px-6 z-10 sticky top-0 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-1.5 -ml-1 text-text-secondary hover:bg-bg-secondary rounded-lg"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={18} />
            </button>

            {/* Global Command Palette Trigger Button */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-secondary border border-border text-text-secondary hover:text-text hover:border-border-hover text-xs font-medium transition-all shadow-2xs"
            >
              <Search size={14} className="text-text-muted" />
              <span className="hidden sm:inline">Search features...</span>
              <span className="bg-surface px-1.5 py-0.5 rounded border border-border text-[10px] font-mono font-semibold text-text-muted">Ctrl+K</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Center Trigger */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 rounded-lg hover:bg-bg-secondary text-text-secondary hover:text-text transition-colors border border-transparent hover:border-border"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-3.5 min-w-[14px] px-1 rounded-full bg-danger text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              
              {notificationsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-80 bg-surface border border-border rounded-xl shadow-md z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-secondary">
                      <span className="font-bold text-xs text-text flex items-center gap-1.5">
                        <Bell size={14} className="text-primary" /> Notifications ({unreadCount})
                      </span>
                      <button
                        onClick={markAllNotificationsRead}
                        className="text-[10px] font-semibold text-primary hover:underline"
                      >
                        Mark all read
                      </button>
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-border">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-xs text-text-muted font-medium">No alerts registered.</div>
                      ) : (
                        notifications.map((n) => (
                          <div 
                            key={n._id || n.id} 
                            onClick={() => handleNotificationClick(n)}
                            className={`p-3 transition-colors hover:bg-bg-secondary cursor-pointer ${n.read ? "opacity-60" : "bg-primary-bg/30"}`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <strong className="text-xs font-semibold text-text">{n.title}</strong>
                              <span className="text-[9px] text-text-muted font-mono">
                                {n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Now"}
                              </span>
                            </div>
                            <p className="text-[11px] text-text-secondary m-0 leading-normal font-medium">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Profile Widget */}
            <div className="flex items-center gap-2 bg-bg-secondary px-2.5 py-1 rounded-lg border border-border">
              <div className="h-5.5 w-5.5 rounded-md bg-primary text-white flex items-center justify-center font-bold text-xs">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </div>
              <span className="text-xs font-semibold text-text hidden sm:inline-block truncate max-w-[140px]">
                {user?.name || user?.email}
              </span>
            </div>
          </div>
        </header>

        {/* Scrollable Main Content Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scroll-smooth">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </div>

        {/* AI Copilot Floating Chat */}
        <CopilotChat />
      </main>

      {/* Command Palette Modal */}
      {commandPaletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
          <div className="fixed inset-0 bg-text/30 backdrop-blur-xs transition-opacity" onClick={() => setCommandPaletteOpen(false)}></div>
          
          <div className="relative w-full max-w-lg bg-surface border border-border rounded-xl shadow-lg overflow-hidden z-50 flex flex-col max-h-[380px]">
            <div className="flex items-center border-b border-border px-4 py-3 gap-2.5">
              <Search size={16} className="text-text-muted" />
              <input
                ref={paletteInputRef}
                type="text"
                placeholder="Search features..."
                className="flex-1 bg-transparent border-0 outline-none text-text text-xs placeholder-text-muted font-medium w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handlePaletteKeyDown}
              />
              <button 
                onClick={() => setCommandPaletteOpen(false)}
                className="text-[10px] font-semibold text-text-muted border border-border px-1.5 py-0.5 rounded hover:bg-bg-secondary"
              >
                ESC
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto py-1">
              {filteredFeatures.length === 0 ? (
                <div className="p-6 text-center text-xs text-text-muted font-medium">
                  No matching features found.
                </div>
              ) : (
                filteredFeatures.map((item, idx) => {
                  const Icon = item.icon;
                  const isSelected = idx === paletteIndex;
                  return (
                    <div
                      key={item.to}
                      onClick={() => {
                        navigate(item.to);
                        setCommandPaletteOpen(false);
                      }}
                      className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors ${
                        isSelected ? "bg-primary text-white" : "hover:bg-bg-secondary text-text-secondary"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon size={15} />
                        <span className={`text-xs font-semibold ${isSelected ? "text-white" : "text-text"}`}>
                          {item.label}
                        </span>
                      </div>
                      <span className={`text-[10px] ${isSelected ? "text-white/70" : "text-text-muted"}`}>
                        {item.to}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
