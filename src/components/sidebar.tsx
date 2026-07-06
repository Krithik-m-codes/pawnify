"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Coins,
  CalendarCheck,
  BarChart3,
  ShieldCheck,
  Settings,
  LogOut,
  Menu,
  X,
  Scale,
  Sparkles,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";

interface SidebarProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavContentProps {
  user: SidebarProps["user"];
  pathname: string;
  navItems: NavItem[];
  adminItems: NavItem[];
  setMobileOpen: (open: boolean) => void;
  handleLogout: () => void;
  loggingOut: boolean;
}

function NavContent({
  user,
  pathname,
  navItems,
  adminItems,
  setMobileOpen,
  handleLogout,
  loggingOut,
}: NavContentProps) {
  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950/90 border-r border-zinc-800/80 p-4 select-none">
      {/* Brand */}
      <div className="flex items-center gap-3 px-2 py-3 mb-6 border-b border-zinc-800/80">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-zinc-950 shadow-lg shadow-amber-500/20">
          <Scale className="w-6 h-6 stroke-[2.5]" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent">
              Pawnify
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
              IN
            </span>
          </div>
          <p className="text-[11px] text-zinc-400">Gold & Silver Loans</p>
        </div>
      </div>

      {/* Main Nav */}
      <div className="space-y-1 flex-1 overflow-y-auto pr-1">
        <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          Overview & Management
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                active
                  ? "bg-gradient-to-r from-amber-500/20 to-amber-500/5 text-amber-400 border-l-2 border-amber-500 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/80"
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  active ? "text-amber-400" : "text-zinc-500"
                }`}
              />
              {item.label}
            </Link>
          );
        })}

        {/* Admin Section */}
        {user.role === "ADMIN" && (
          <>
            <div className="px-3 pt-6 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Admin Controls
            </div>
            {adminItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                    active
                      ? "bg-gradient-to-r from-amber-500/20 to-amber-500/5 text-amber-400 border-l-2 border-amber-500 shadow-sm"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/80"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      active ? "text-amber-400" : "text-zinc-500"
                    }`}
                  />
                  {item.label}
                </Link>
              );
            })}
          </>
        )}
      </div>

      {/* User Profile Footer */}
      <div className="pt-4 border-t border-zinc-800/80 mt-auto">
        <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-zinc-200 truncate">
                {user.name}
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                  user.role === "ADMIN"
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                }`}
              >
                {user.role}
              </span>
            </div>
            <p className="text-xs text-zinc-500 truncate mt-0.5">
              {user.email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            title="Sign out"
            className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const navItems: NavItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Customers", href: "/customers", icon: Users },
    { label: "Loans", href: "/loans", icon: Coins },
    { label: "Follow-ups", href: "/followups", icon: CalendarCheck },
    { label: "Reports", href: "/reports", icon: BarChart3 },
  ];

  const adminItems: NavItem[] = [
    { label: "Staff & Users", href: "/admin/staff", icon: ShieldCheck },
    { label: "App Settings", href: "/admin/settings", icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await authClient.signOut();
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
      setLoggingOut(false);
    }
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 shadow-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          aria-label="Toggle Navigation"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fadeIn"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`lg:hidden fixed top-0 left-0 bottom-0 w-72 z-50 transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <NavContent
          user={user}
          pathname={pathname}
          navItems={navItems}
          adminItems={adminItems}
          setMobileOpen={setMobileOpen}
          handleLogout={handleLogout}
          loggingOut={loggingOut}
        />
      </aside>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 h-screen sticky top-0 shrink-0">
        <NavContent
          user={user}
          pathname={pathname}
          navItems={navItems}
          adminItems={adminItems}
          setMobileOpen={setMobileOpen}
          handleLogout={handleLogout}
          loggingOut={loggingOut}
        />
      </aside>
    </>
  );
}
