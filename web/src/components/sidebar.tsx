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
  Sun,
  Moon,
  UserCog,
  Globe,
  Building2,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useTheme } from "@/components/theme-provider";

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
  theme: "light" | "dark";
  toggleTheme: () => void;
}

function NavContent({
  user,
  pathname,
  navItems,
  adminItems,
  setMobileOpen,
  handleLogout,
  loggingOut,
  theme,
  toggleTheme,
}: NavContentProps) {
  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <div
      className="flex flex-col h-full p-4 select-none"
      style={{
        background: "var(--bg-sidebar)",
        borderRight: "1px solid var(--border-primary)",
      }}
    >
      {/* Brand */}
      <div
        className="flex items-center justify-between px-3 py-4 mb-4"
        style={{ borderBottom: "1px solid var(--border-primary)" }}
      >
        <Link href="/dashboard" className="flex items-center gap-2.5 group cursor-pointer">
          <img
            src="/icon.png"
            alt="Pawnify Icon"
            className="w-8 h-8 object-contain transition-transform duration-300 group-hover:scale-110"
          />
          <span
            className="font-extrabold text-lg tracking-tight dark:text-white transition-colors font-sans"
            style={{ color: "var(--text-primary)" }}
          >
            PAWNIFY
          </span>
        </Link>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wider"
          style={{
            background: "var(--accent-bg)",
            color: "var(--accent-text)",
            border: "1px solid var(--accent-border)",
          }}
        >
          IN
        </span>
      </div>

      {/* Main Nav */}
      <div className="space-y-1 flex-1 overflow-y-auto pr-1">
        <div
          className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--text-muted)" }}
        >
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
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200"
              style={
                active
                  ? {
                      background: "var(--accent-bg)",
                      color: "var(--accent-text)",
                      borderLeft: "3px solid var(--accent)",
                    }
                  : { color: "var(--text-tertiary)" }
              }
            >
              <span style={{ color: active ? "var(--accent-text)" : "var(--text-muted)" }}>
                <Icon className="w-4 h-4 shrink-0 transition-colors" />
              </span>
              {item.label}
            </Link>
          );
        })}

        {/* Admin Section */}
        {user.role === "ADMIN" && (
          <>
            <div
              className="px-3 pt-6 pb-1.5 text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5"
              style={{ color: "var(--text-muted)" }}
            >
              <span style={{ color: "var(--accent)" }}>
                <Sparkles className="w-3 h-3" />
              </span>
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
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200"
                  style={
                    active
                      ? {
                          background: "var(--accent-bg)",
                          color: "var(--accent-text)",
                          borderLeft: "3px solid var(--accent)",
                        }
                      : { color: "var(--text-tertiary)" }
                  }
                >
                  <span style={{ color: active ? "var(--accent-text)" : "var(--text-muted)" }}>
                    <Icon className="w-4 h-4 shrink-0 transition-colors" />
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </>
        )}
      </div>

      {/* Theme Toggle - Animated Segmented Pill Switcher */}
      <div className="pt-3 mb-3" style={{ borderTop: "1px solid var(--border-primary)" }}>
        <div
          onClick={toggleTheme}
          className="w-full p-1 rounded-xl flex items-center justify-between cursor-pointer transition-all duration-300 relative select-none shadow-inner"
          style={{
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border-primary)",
          }}
          title="Click to switch theme"
        >
          <div
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 z-10 ${
              theme === "light"
                ? "bg-(--bg-card) text-(--text-primary) shadow-md transform scale-[1.02]"
                : "text-(--text-muted) hover:text-(--text-secondary)"
            }`}
          >
            <Sun className={`w-3.5 h-3.5 ${theme === "light" ? "text-(--accent)" : ""}`} />
            <span>Light</span>
          </div>
          <div
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 z-10 ${
              theme === "dark"
                ? "bg-(--bg-card) text-(--accent) shadow-md border border-(--accent-border) transform scale-[1.02]"
                : "text-(--text-muted) hover:text-(--text-secondary)"
            }`}
          >
            <Moon className={`w-3.5 h-3.5 ${theme === "dark" ? "text-(--accent)" : ""}`} />
            <span>Dark</span>
          </div>
        </div>
      </div>

      {/* User Profile Footer */}
      <div>
        <div
          className="p-3 rounded-xl flex items-center justify-between gap-3"
          style={{
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border-primary)",
          }}
        >
          <Link href="/profile" className="min-w-0 flex-1 hover:opacity-80 transition-opacity">
            <div className="flex items-center gap-2">
              <span
                className="font-semibold text-sm truncate"
                style={{ color: "var(--text-primary)" }}
              >
                {user.name}
              </span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase"
                style={
                  user.role === "ADMIN"
                    ? {
                        background: "var(--accent-bg)",
                        color: "var(--accent-text)",
                        border: "1px solid var(--accent-border)",
                      }
                    : {
                        background: "rgba(59, 130, 246, 0.1)",
                        color: "#3b82f6",
                        border: "1px solid rgba(59, 130, 246, 0.25)",
                      }
                }
              >
                {user.role}
              </span>
            </div>
            <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-muted)" }}>
              {user.email}
            </p>
          </Link>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            title="Sign out"
            className="p-2 rounded-lg transition-colors shrink-0 disabled:opacity-50 cursor-pointer hover:bg-red-500/10"
            style={{ color: "var(--text-muted)" }}
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
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const navItems: NavItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Customers", href: "/customers", icon: Users },
    { label: "Loans", href: "/loans", icon: Coins },
    { label: "Follow-ups", href: "/followups", icon: CalendarCheck },
    { label: "Reports", href: "/reports", icon: BarChart3 },
    { label: "My Profile", href: "/profile", icon: UserCog },
  ];

  const adminItems: NavItem[] = [
    { label: "Setup Wizard", href: "/onboarding", icon: Globe },
    { label: "Platform Control", href: "/platform-admin", icon: Building2 },
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
          className="p-2.5 rounded-xl shadow-lg transition-colors cursor-pointer"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-primary)",
            color: "var(--text-primary)",
          }}
          aria-label="Toggle Navigation"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 animate-fadeIn"
          style={{ background: "var(--bg-overlay)" }}
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
          theme={theme}
          toggleTheme={toggleTheme}
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
          theme={theme}
          toggleTheme={toggleTheme}
        />
      </aside>
    </>
  );
}
