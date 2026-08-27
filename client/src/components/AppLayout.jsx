import React, { useState } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  FileText,
  LayoutDashboard,
  LogOut,
  Mic,
  Settings,
  Sparkles,
  Menu,
  X,
  Users,
  Target,
  Award,
  BookOpen,
  FolderGit2
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

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  // Close mobile menu on route change
  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

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
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest block mb-0.5">Phase 1 Foundation</span>
              <h1 className="text-lg font-bold text-text m-0 leading-tight">Welcome back, {user?.name || "Pilot"}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-bg-secondary px-3 py-1.5 rounded-full border border-border shadow-sm cursor-pointer hover:bg-border transition-colors">
            <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <span className="text-sm font-bold text-text hidden sm:inline-block truncate max-w-[150px]">{user?.email}</span>
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
    </div>
  );
}
