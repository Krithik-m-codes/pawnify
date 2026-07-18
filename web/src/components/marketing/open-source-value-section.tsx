"use client";

import React from "react";
import Link from "next/link";
import {
  Code2,
  Sparkles,
  HeartHandshake,
  DollarSign,
  Cpu,
  Layers,
  ArrowRight,
  CheckCircle2,
  GitBranch,
  Star,
  ShieldCheck,
} from "lucide-react";
import { motion } from "framer-motion";

export function OpenSourceValueSection() {
  return (
    <section className="py-24 sm:py-32 border-t border-(--border-primary) bg-gradient-to-b from-(--bg-primary) via-(--bg-secondary)/40 to-(--bg-primary) relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-emerald-500/05 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 mb-4 shadow-2xs">
            <Code2 className="w-3.5 h-3.5" />
            <span>OPEN SOURCE &amp; SUSTAINABILITY</span>
          </div>
          <h2
            className="text-3xl sm:text-5xl font-black -tracking-[0.03em] leading-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Why Open Source? And How We Make It Worthwhile.
          </h2>
          <p className="mt-4 text-base sm:text-lg" style={{ color: "var(--text-secondary)" }}>
            We believe financial institutions deserve data sovereignty without vendor lock-in. Here is how our dual-path open source model aligns community contribution with long-term commercial sustainability.
          </p>
        </div>

        {/* 3 Pillars of Open Source & Monetization */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="shine-border-card p-8 rounded-3xl border border-(--border-primary) bg-(--bg-card) flex flex-col justify-between hover:border-emerald-500/40 transition-all shadow-lg"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6">
                <GitBranch className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-(--text-primary)">
                1. Free Self-Hosted Sovereignty
              </h3>
              <p className="mt-3 text-sm text-(--text-secondary) leading-relaxed">
                Deploy Pawnify on your own servers at zero software cost under our BSL 1.1 license (which automatically converts to open-source MIT). You own your customer data, ledgers, and KYC files outright—never trapped in proprietary legacy systems.
              </p>
            </div>
            <div className="mt-6 pt-5 border-t border-(--border-primary) text-xs font-mono text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Zero License Fees Forever</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="shine-border-card p-8 rounded-3xl border border-(--border-primary) bg-(--bg-card) flex flex-col justify-between hover:border-emerald-500/40 transition-all shadow-lg"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-6">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-(--text-primary)">
                2. The Plugin Ecosystem &amp; Marketplace
              </h3>
              <p className="mt-3 text-sm text-(--text-secondary) leading-relaxed">
                We empower developers to publish and monetize custom plugins. Whether it is hardware jeweler scale drivers, regional tax compliance modules (India GST, US sales tax), or local SMS gateways (Twilio, Exotel), contributors can build and earn across our growing lending network.
              </p>
            </div>
            <div className="mt-6 pt-5 border-t border-(--border-primary) text-xs font-mono text-amber-500 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Extensible API &amp; Webhook Engine</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="shine-border-card p-8 rounded-3xl border border-(--border-primary) bg-(--bg-card) flex flex-col justify-between hover:border-emerald-500/40 transition-all shadow-lg"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-6">
                <DollarSign className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-(--text-primary)">
                3. Managed Cloud SaaS Quotas &amp; SLA
              </h3>
              <p className="mt-3 text-sm text-(--text-secondary) leading-relaxed">
                For lenders who want zero infrastructure maintenance, our Cloud SaaS provides instant managed hosting. We monetize through tiered active-loan quotas and multi-branch enterprise support, which funds continuous R&amp;D for our open-source core.
              </p>
            </div>
            <div className="mt-6 pt-5 border-t border-(--border-primary) text-xs font-mono text-blue-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Sustains 100% of Open-Source R&amp;D</span>
            </div>
          </motion.div>
        </div>

        {/* Community & GitHub CTA Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/15 via-[#060a14] to-emerald-500/10 p-8 sm:p-12 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-8 text-center lg:text-left"
        >
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              Join Our Open-Source Community
            </div>
            <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Ready to deploy or contribute to Pawnify?
            </h3>
            <p className="text-sm sm:text-base text-slate-300">
              Check out our public repository, explore the architecture guidelines, or launch your self-hosted instance in under 5 minutes.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0 w-full lg:w-auto">
            <a
              href="https://github.com/libresource/pawnify"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 text-sm font-bold tracking-wider uppercase shadow-xl shadow-emerald-500/30"
            >
              <Code2 className="w-4 h-4" />
              Star on GitHub
              <ArrowRight className="w-4 h-4" />
            </a>

            <Link
              href="/pricing"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-xs font-bold uppercase tracking-wider text-white transition-all"
            >
              View Cloud Quotas
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
