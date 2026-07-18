"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, Code2, ExternalLink, Activity, Lock, FileText, Bot, Award } from "lucide-react";

export function MarketingFooter() {
  return (
    <footer className="border-t border-(--border-primary) bg-[#060a14] text-slate-400 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Top Business Assurance Bar inside Footer */}
        <div className="pb-12 mb-12 border-b border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-bold text-white uppercase tracking-wider">99.99% Cloud Uptime</div>
              <div className="text-[11px] text-slate-400 font-mono">Verified SLA across global regions</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white uppercase tracking-wider">Bank-Grade Security</div>
              <div className="text-[11px] text-slate-400 font-mono">Protected multi-branch data isolation</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white uppercase tracking-wider">Audit-Ready Receipts</div>
              <div className="text-[11px] text-slate-400 font-mono">Printable double-entry digital records</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-12">
          {/* Col 1: Brand & Assay Identity (Span 4) */}
          <div className="space-y-4 md:col-span-4">
            <Link href="/" className="flex items-center gap-2.5">
              <img src="/icon.png" alt="Pawnify" className="w-8 h-8 object-contain" />
              <span className="text-xl font-black tracking-tight text-white font-sans">
                PAWNIFY
              </span>
            </Link>
            <p className="text-xs leading-relaxed text-slate-400 max-w-sm">
              The modern cloud operating system for asset-backed lending, collateral valuation, and multi-branch pawn shop networks. Built with automated KYC and live spot market feeds.
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>ASSAY CERTIFIED • FREE SELF-HOST OR CLOUD</span>
            </div>
          </div>

          {/* Col 2: Platform Links (Span 3) */}
          <div className="space-y-3 md:col-span-3">
            <h3 className="text-xs font-bold tracking-wider uppercase text-white font-mono">
              Capabilities &amp; Tools
            </h3>
            <ul className="space-y-2 text-xs font-medium">
              <li>
                <Link href="/#features" className="hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                  Multi-Storefront Features
                </Link>
              </li>
              <li>
                <Link href="/#calculator" className="hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                  Live LTV &amp; Collateral Simulator
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                  Cloud SaaS Quotas &amp; Pricing
                </Link>
              </li>
              <li>
                <Link href="/open-source" className="hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                  Why Open Source &amp; Plugins?
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: AI Crawler & Developer Index (Span 3) */}
          <div className="space-y-3 md:col-span-3">
            <h3 className="text-xs font-bold tracking-wider uppercase text-white font-mono flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-emerald-400" />
              AI Crawlers &amp; Contributors
            </h3>
            <ul className="space-y-2 text-xs font-medium">
              <li>
                <a href="/llms.txt" className="hover:text-emerald-400 transition-colors flex items-center gap-1 font-mono text-emerald-400">
                  <FileText className="w-3 h-3" />
                  llms.txt (AI Crawler Index)
                </a>
              </li>
              <li>
                <a href="/llms-full.txt" className="hover:text-emerald-400 transition-colors flex items-center gap-1 font-mono text-emerald-400">
                  <FileText className="w-3 h-3" />
                  llms-full.txt (Full Specifications)
                </a>
              </li>
              <li>
                <Link href="/docs" className="hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                  Developer Documentation &amp; APIs
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/libresource/pawnify"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 hover:text-white transition-colors"
                >
                  <Code2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>GitHub Open Source Repo</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Governance & Legal (Span 2) */}
          <div className="space-y-3 md:col-span-2">
            <h3 className="text-xs font-bold tracking-wider uppercase text-white font-mono">
              Governance
            </h3>
            <ul className="space-y-2 text-xs font-medium">
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <span className="text-[10px] text-slate-500 font-mono leading-tight block">
                  License: Business Source License 1.1 (Converts to MIT on 2029-07-01). Free to self-host forever.
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            &copy; {new Date().getFullYear()} Pawnify Cloud Inc. All rights reserved. Engineered for global lending compliance.
          </div>
          <div className="font-mono text-[11px] flex items-center gap-3">
            <span>Asset-Backed Lending Operating System</span>
            <span>•</span>
            <span className="text-emerald-400 font-semibold">12+ Worldwide Jurisdictions</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
