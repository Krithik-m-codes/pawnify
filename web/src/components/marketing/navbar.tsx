"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  ArrowRight,
  Sun,
  Moon,
  Menu,
  X,
  Code2,
  BookOpen,
  DollarSign,
  Layers,
  Sparkles,
  TrendingUp,
  Building2,
  Scale,
} from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "@/components/theme-provider";

interface NavbarProps {
  isAuthenticated?: boolean;
}

export function MarketingNavbar({ isAuthenticated = false }: NavbarProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Capabilities", href: "/#features", icon: Layers },
    { label: "Live LTV Simulator", href: "/#calculator", icon: Scale },
    { label: "SaaS & Quotas", href: "/pricing", icon: DollarSign },
    { label: "Why Open Source?", href: "/open-source", icon: Code2 },
    { label: "Docs & Guides", href: "/docs", icon: BookOpen },
  ];

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "border-b border-(--border-primary) bg-(--bg-primary)/90 backdrop-blur-2xl shadow-sm"
          : "border-b border-transparent bg-(--bg-primary)/60 backdrop-blur-lg"
      }`}
    >
      {/* Business Top Strip: Live Market Spot Rates & Network Health */}
      <div className="border-b border-(--border-primary)/60 bg-(--bg-secondary)/70 py-1.5 px-4 text-center sm:text-left text-[11px] font-mono tracking-wide text-(--text-tertiary)">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 font-bold text-amber-500">
              <TrendingUp className="w-3 h-3 animate-pulse" />
              LIVE SPOT: AU 24K $2,842.60/oz ($91.39/g)
            </span>
            <span className="hidden md:inline text-(--text-muted)">|</span>
            <span className="hidden md:inline-flex items-center gap-1 text-slate-400">
              AG 999 $32.85/oz ($1.05/g)
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-[10px] font-semibold uppercase">
            <span className="text-emerald-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Multi-Branch Network Ready
            </span>
            <span>•</span>
            <span className="text-(--text-secondary)">Automated LTV Safety Capping</span>
            <span>•</span>
            <span className="text-emerald-500 font-bold">Free Self-Hosted or Cloud SaaS</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Hallmark Badge */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative">
            <img
              src="/icon.png"
              alt="Pawnify"
              className="w-8 h-8 object-contain transition-transform duration-300 group-hover:scale-110"
            />
          </div>
          <div className="flex items-center gap-2">
            <span
              className="text-lg font-black tracking-tight font-sans"
              style={{ color: "var(--text-primary)" }}
            >
              PAWNIFY
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase border border-emerald-500/40 bg-emerald-500/15 text-emerald-400 shadow-xs shadow-emerald-500/20">
              <ShieldCheck className="w-3 h-3" /> 999.9 FINE
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-7">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.label}
                href={link.href}
                className={`text-xs font-semibold tracking-wide uppercase transition-all flex items-center gap-1.5 py-1 ${
                  isActive
                    ? "text-(--accent) font-bold"
                    : "text-(--text-secondary) hover:text-(--text-primary) hover:translate-x-0.5"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Action Buttons */}
        <div className="hidden md:flex items-center gap-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl transition-all duration-200 hover:scale-105 cursor-pointer border border-(--border-primary) bg-(--bg-card) shadow-2xs hover:border-(--accent-border)"
            style={{ color: "var(--text-secondary)" }}
            aria-label="Toggle theme"
          >
            {theme === "light" ? (
              <Moon className="w-4 h-4" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400" />
            )}
          </button>

          <Link
            href="/login?demo=true"
            className="hidden xl:inline-flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase px-4 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Launch Instant Sandbox
          </Link>

          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="btn-primary inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-5 py-2.5 shadow-md shadow-emerald-500/25"
            >
              Console
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <Link
              href="/login"
              className="btn-primary inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-5 py-2.5 shadow-md shadow-emerald-500/25"
            >
              Sign In
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {/* Mobile Menu Trigger */}
        <div className="flex lg:hidden items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-(--border-primary) bg-(--bg-card)"
            aria-label="Toggle theme"
          >
            {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-xl border border-(--border-primary) bg-(--bg-card)"
            aria-label="Toggle mobile menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {mobileOpen && (
        <div className="lg:hidden border-b border-(--border-primary) bg-(--bg-card)/95 backdrop-blur-2xl px-4 py-5 space-y-3 animate-fadeIn">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-(--text-primary) hover:bg-(--bg-tertiary) border border-transparent hover:border-(--border-primary)"
            >
              <link.icon className="w-4 h-4 text-(--accent)" />
              {link.label}
            </Link>
          ))}
          <div className="pt-3 border-t border-(--border-primary) flex flex-col gap-2">
            <Link
              href="/login?demo=true"
              onClick={() => setMobileOpen(false)}
              className="w-full flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider py-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
            >
              <Sparkles className="w-4 h-4" />
              Launch Instant Sandbox
            </Link>
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="btn-primary w-full flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider py-3"
              >
                Go to Dashboard
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="btn-primary w-full flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider py-3"
              >
                Sign In
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      )}
    </motion.header>
  );
}
