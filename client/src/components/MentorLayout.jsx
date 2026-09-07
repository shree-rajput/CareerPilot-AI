import React, { useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { LogOut, LayoutDashboard, Users, MessageSquare, BarChart, User, Menu, X } from "lucide-react";

export function MentorLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate("/mentor/login", { replace: true });
  }

  const navItems = [
    { to: "/mentor/dashboard", icon: LayoutDashboard, label: "Overview" },
    { to: "/mentor/students", icon: Users, label: "Mentees" },
    { to: "/mentor/feedback", icon: MessageSquare, label: "Feedback" },
    { to: "/mentor/analytics", icon: BarChart, label: "Analytics" },
    { to: "/mentor/profile", icon: User, label: "My Profile" }
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-lg shadow-lg">
          M
        </div>
        <div className="flex flex-col">
          <span className="text-base font-bold leading-tight tracking-tight text-white">Mentor Portal</span>
          <span className="text-[10px] font-semibold text-white/50 tracking-wider uppercase">CareerPilot AI</span>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider px-3 block mb-4">
          Navigation
        </span>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to || (item.to !== "/mentor/dashboard" && location.pathname.startsWith(item.to));
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-indigo-500/10 text-indigo-400 font-semibold shadow-inner"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon size={18} className={isActive ? "text-indigo-400" : "text-white/40"} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10 shrink-0">
        <div className="flex items-center gap-3 px-3 py-3 mb-2 rounded-xl bg-white/5">
          <div className="h-8 w-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-sm">
            {user?.name?.[0]?.toUpperCase() || "M"}
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-xs font-semibold text-white truncate">{user?.name}</span>
            <span className="text-[10px] text-white/50 truncate">Mentor</span>
          </div>
        </div>
        <button
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-white/60 hover:text-red-400 hover:bg-red-400/10 transition-colors"
          type="button"
          onClick={handleLogout}
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] font-sans overflow-hidden">
      <aside className="hidden md:flex flex-col w-72 shrink-0 z-20 shadow-xl">
        <SidebarContent />
      </aside>

      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative flex flex-col w-72 max-w-[80%] h-full shadow-2xl">
            <button className="absolute top-4 right-4 p-2 text-white/50 hover:bg-white/10 rounded-lg" onClick={() => setMobileMenuOpen(false)}>
              <X size={20} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="md:hidden h-16 shrink-0 bg-white border-b border-slate-200 flex items-center px-4 z-10 sticky top-0 shadow-sm">
          <button
            className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu size={24} />
          </button>
          <span className="ml-3 font-bold text-slate-800">Mentor Portal</span>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8 scroll-smooth">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
