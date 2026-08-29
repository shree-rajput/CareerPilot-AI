import React, { useState, useEffect, useRef } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  FileText,
  LayoutDashboard,
  LogOut,
  Sparkles,
  Menu,
  X,
  Users,
  Target,
  Award,
  BookOpen,
  FolderGit2,
  Search,
  Bell,
  Command,
  Code2,
  GraduationCap
} from "lucide-react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { Button } from "./ui/Button";
import { CopilotChat } from "./CopilotChat";

import { FEATURES, FEATURE_STATUS } from "../config/features";

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
  const [notifications, setNotifications] = useState([
    {
      id: "n1",
      title: "Welcome to CareerPilot OS",
      message: "Establish your profile and complete priority actions to raise your Readiness Score.",
      read: false,
      date: "Just now"
    },
    {
      id: "n2",
      title: "Demo Mentors Active",
      message: "Demo mode is active. Five industry mock mentors are loaded and ready in the Matching Engine.",
      read: false,
      date: "5m ago"
    }
  ]);

  // Handle Ctrl+K Command Palette Trigger
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Reset indices on query change
  useEffect(() => {
    setPaletteIndex(0);
  }, [searchQuery]);

  // Focus palette input on open
  useEffect(() => {
    if (commandPaletteOpen) {
      setTimeout(() => paletteInputRef.current?.focus(), 50);
    } else {
      setSearchQuery("");
    }
  }, [commandPaletteOpen]);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  // Filter features based on search query
  const filteredFeatures = FEATURES.filter(item => 
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Keyboard navigation inside Palette
  const handlePaletteKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setPaletteIndex((prev) => (prev + 1) % Math.max(filteredFeatures.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setPaletteIndex((prev) => (prev - 1 + filteredFeatures.length) % Math.max(filteredFeatures.length, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredFeatures[paletteIndex]) {
        navigate(filteredFeatures[paletteIndex].to);
        setCommandPaletteOpen(false);
      }
    } else if (e.key === "Escape") {
      setCommandPaletteOpen(false);
    }
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const SidebarContent = () => (
    <>
      <div className="flex items-center gap-3 px-6 py-6 mb-4">
        <div className="bg-primary text-white p-1.5 rounded-lg shadow-sm">
          <Sparkles size={24} aria-hidden="true" />
        </div>
        <div className="flex flex-col">
          <strong className="text-text font-bold text-lg leading-tight">CareerPilot AI</strong>
          <span className="text-text-secondary text-[11px] font-bold uppercase tracking-wider">Command Center</span>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto" aria-label="Primary navigation">
        {FEATURES.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.to);
          const isFuture = item.status !== FEATURE_STATUS.WORKING;
          
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg font-bold text-sm transition-all ${isActive
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "text-text-secondary hover:bg-bg-secondary hover:text-text"
                }`}
            >
              <div className="flex items-center gap-3">
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </div>
              {isFuture && (
                <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                  isActive ? "bg-white/20 text-white" : "bg-bg text-text-secondary border border-border"
                }`}>
                  {item.phaseLabel}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border mt-auto">
        <button
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg font-bold text-sm text-danger hover:bg-danger-bg transition-colors"
          type="button"
          onClick={handleLogout}
        >
          <LogOut size={18} aria-hidden="true" />
          <span>Log out</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen w-full bg-bg font-sans overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-surface border-r border-border shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-text/50 backdrop-blur-sm transition-opacity" onClick={() => setMobileMenuOpen(false)}></div>
          <aside className="relative flex flex-col w-64 max-w-[80%] bg-surface h-full shadow-2xl animate-in slide-in-from-left-full duration-300">
            <button className="absolute top-4 right-4 p-2 text-text-secondary hover:bg-bg-secondary rounded-full" onClick={() => setMobileMenuOpen(false)}>
              <X size={20} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-bg relative">
        <header className="h-16 shrink-0 bg-surface border-b border-border flex items-center justify-between px-4 sm:px-8 z-10 sticky top-0 shadow-sm transition-all">
          <div className="flex items-center gap-4">
            <button
              className="md:hidden p-2 -ml-2 text-text-secondary hover:bg-bg-secondary rounded-lg"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="hidden sm:block">
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest block mb-0.5">Placement OS</span>
              <h1 className="text-lg font-bold text-text m-0 leading-tight">Welcome back, {user?.name || "Candidate"}</h1>
            </div>

            {/* Global Command Palette Trigger Button */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-secondary border border-border text-text-secondary hover:text-text text-xs font-semibold transition-all hover:bg-border/50 shadow-sm"
            >
              <Search size={14} />
              <span className="hidden md:inline">Command Palette...</span>
              <span className="bg-surface px-1.5 py-0.5 rounded border border-border text-[9px] font-mono font-bold tracking-wider text-text-secondary shadow-sm">Ctrl+K</span>
            </button>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification Center Trigger */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 rounded-full hover:bg-bg-secondary text-text-secondary hover:text-text transition-colors border border-transparent hover:border-border"
              >
                <Bell size={20} />
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-danger animate-pulse"></span>
                )}
              </button>
              
              {notificationsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-80 bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-secondary">
                      <span className="font-bold text-xs text-text">Notifications</span>
                      <button
                        onClick={markAllNotificationsRead}
                        className="text-[10px] font-bold text-primary hover:underline"
                      >
                        Mark all read
                      </button>
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-border">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-xs text-text-secondary">No new alerts.</div>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} className={`p-4 transition-colors hover:bg-bg-secondary ${n.read ? "opacity-75" : "bg-primary/5"}`}>
                            <div className="flex items-center justify-between mb-1">
                              <strong className="text-xs font-bold text-text leading-tight">{n.title}</strong>
                              <span className="text-[9px] text-text-secondary">{n.date}</span>
                            </div>
                            <p className="text-[11px] text-text-secondary m-0 leading-normal">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Profile Widget */}
            <div className="flex items-center gap-3 bg-bg-secondary px-3 py-1.5 rounded-full border border-border shadow-sm">
              <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </div>
              <span className="text-sm font-bold text-text hidden sm:inline-block truncate max-w-[150px]">{user?.email}</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8 scroll-smooth">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </div>

        {/* AI Copilot Floating Chat */}
        <CopilotChat />
      </main>

      {/* Global Command Palette Modal Overlay */}
      {commandPaletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4">
          <div className="fixed inset-0 bg-text/40 backdrop-blur-sm transition-opacity" onClick={() => setCommandPaletteOpen(false)}></div>
          
          <div className="relative w-full max-w-xl bg-surface border border-border rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col max-h-[400px] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center border-b border-border px-4 py-3 gap-3">
              <Search size={18} className="text-text-secondary" />
              <input
                ref={paletteInputRef}
                type="text"
                placeholder="Search command center features..."
                className="flex-1 bg-transparent border-0 outline-none text-text text-sm placeholder-text-secondary font-medium w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handlePaletteKeyDown}
              />
              <button 
                onClick={() => setCommandPaletteOpen(false)}
                className="text-[10px] font-bold text-text-secondary border border-border px-1.5 py-0.5 rounded hover:bg-bg-secondary"
              >
                ESC
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto py-2">
              {filteredFeatures.length === 0 ? (
                <div className="p-8 text-center text-xs text-text-secondary font-medium">
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
                      className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${
                        isSelected ? "bg-primary text-white" : "hover:bg-bg-secondary text-text-secondary"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={16} />
                        <span className={`text-xs font-bold ${isSelected ? "text-white" : "text-text"}`}>
                          {item.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isSelected && (
                          <span className="text-[9px] uppercase tracking-widest font-mono font-bold bg-white/20 px-1.5 py-0.5 rounded">
                            Select
                          </span>
                        )}
                        <span className={`text-[10px] ${isSelected ? "text-white/60" : "text-text-secondary"}`}>
                          {item.to}
                        </span>
                      </div>
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
