"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  Layers, 
  Droplets, 
  Flame, 
  Box, 
  Cpu, 
  Database, 
  Terminal, 
  Search, 
  Bell, 
  ChevronRight, 
  Zap, 
  Sliders,
  Sparkles,
  Activity,
  CheckCircle2,
  Clock,
  X,
  Lock
} from 'lucide-react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = ['All', 'Solid Mechanics', 'Fluid Machinery', 'Thermodynamics', 'Machine Dynamics'];

  const tools = [
    {
      id: 'beam-stress',
      title: 'Beam Buckling & Stress',
      category: 'Solid Mechanics',
      description: 'Probe buckling thresholds, bending signatures, shear narratives, and deflection stories for structural members.',
      formula: 'P_cr = (π²EI) / (KL)²',
      status: 'JS Solver Ready',
      isReady: true,
      href: '/tools/beam-buckling',
      icon: Layers,
      accentGradient: 'from-blue-500/20 via-cyan-500/10 to-transparent',
      badgeColor: 'text-cyan-400 border-cyan-500/30 bg-cyan-950/50',
      iconBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    },
    {
      id: 'centrifugal-pump',
      title: 'Centrifugal Pump Analysis',
      category: 'Fluid Machinery',
      description: 'Compose pump performance curves, guard against cavitation, and tune efficiency across your hydraulic system.',
      formula: 'TDH = H_s + H_d + h_f',
      status: 'JS Solver Ready',
      isReady: true,
      href: '/tools/centrifugal-pump',
      icon: Droplets,
      accentGradient: 'from-teal-500/20 via-emerald-500/10 to-transparent',
      badgeColor: 'text-teal-400 border-teal-500/30 bg-teal-950/50',
      iconBg: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    },
    {
      id: 'heat-conduction',
      title: 'Heat Transfer Conduction',
      category: 'Thermodynamics',
      description: 'Trace steady-state heat flow across multi-layer barriers and spotlight thermal bottlenecks.',
      formula: 'q = -k A (dT/dx)',
      status: 'JS Solver Ready',
      isReady: true,
      href: '/tools/heat-transfer',
      icon: Flame,
      accentGradient: 'from-orange-500/20 via-amber-500/10 to-transparent',
      badgeColor: 'text-amber-400 border-amber-500/30 bg-amber-950/50',
      iconBg: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    },
    {
      id: 'universal-coupling',
      title: 'Universal Coupling Viewer',
      category: 'Machine Dynamics',
      description: 'Spin through 3D Cardan motion, visualize velocity wobble, and understand kinematic phase drift.',
      formula: 'ω₂ = (ω₁cosα) / (1 - sin²α cos²θ)',
      status: 'ThreeJS Ready',
      isReady: true,
      href: '/tools/universal-coupling',
      icon: Box,
      accentGradient: 'from-purple-500/20 via-indigo-500/10 to-transparent',
      badgeColor: 'text-purple-400 border-purple-500/30 bg-purple-950/50',
      iconBg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    }
  ];

  // Memoized filter for performance
  const filteredTools = useMemo(() => {
    return tools.filter(tool => {
      const matchesTab = activeTab === 'All' || tool.category === activeTab;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = !query || 
                            tool.title.toLowerCase().includes(query) || 
                            tool.description.toLowerCase().includes(query) ||
                            tool.category.toLowerCase().includes(query);
      return matchesTab && matchesSearch;
    });
  }, [activeTab, searchQuery]);

  // Helper to calculate tool count per category
  const getCategoryCount = (cat) => {
    if (cat === 'All') return tools.length;
    return tools.filter(t => t.category === cat).length;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-950">
      
      {/* Top Navigation Bar */}
      <Navbar />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Welcome Hero Banner */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800/80 p-6 sm:p-8 shadow-2xl">
          {/* Ambient Glow Elements */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono font-medium">
                <Sparkles className="w-3.5 h-3.5" /> Engine v2.4 Active
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">MechLab Playground</span>
              </h2>
              <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                Choose your next mechanical experiment, run interactive JavaScript solvers, visualize 3D systems, and revive cached analysis sessions.
              </p>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full md:w-auto">
              <Link 
                href="/tools/centrifugal-pump"
                className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-teal-500/20 transition-all hover:scale-[1.02] active:scale-95 text-sm"
              >
                <Droplets className="w-4 h-4" /> Pump Studio
              </Link>
              <Link 
                href="/tools/beam-buckling"
                className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-95 text-sm"
              >
                <Zap className="w-4 h-4" /> Quick Solvers
              </Link>
            </div>
          </div>

          {/* System Status Indicators Bar */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
            <div className="flex items-center gap-2 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>JS Runtime: <strong className="text-slate-200">Native</strong></span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span>MongoDB Atlas: <strong className="text-slate-200">Connected</strong></span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Activity className="w-3.5 h-3.5 text-purple-400" />
              <span>JS Math Engine: <strong className="text-slate-200">Ready</strong></span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Latency: <strong className="text-slate-200">&lt; 2 ms</strong></span>
            </div>
          </div>
        </section>

        {/* Filter Bar & Search */}
        <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          
          {/* Category Tabs */}
          <div className="flex items-center gap-1 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 overflow-x-auto scrollbar-none">
            {categories.map((cat) => {
              const count = getCategoryCount(cat);
              const isActive = activeTab === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveTab(cat)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                    isActive 
                      ? 'bg-slate-800 text-cyan-400 shadow-sm border border-slate-700/60' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <span>{cat}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isActive ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box with Clear Button */}
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text"
              placeholder="Hunt for the next experiment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-9 pr-9 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </section>

        {/* Active Tools Grid */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>

          {filteredTools.length === 0 && (
            <div className="text-center py-16 bg-slate-900/30 border border-dashed border-slate-800 rounded-2xl space-y-3">
              <Sliders className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-slate-400 text-sm">No engineering modules match your filter parameter.</p>
              <button 
                onClick={() => { setActiveTab('All'); setSearchQuery(''); }}
                className="text-xs text-cyan-400 hover:underline font-mono"
              >
                Reset Search Filters
              </button>
            </div>
          )}
        </section>

      </main>
    </div>
  );
}

// Navbar Component
function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-cyan-600 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/20 text-white flex items-center justify-center">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wider text-white font-mono flex items-center gap-2">
              MECH<span className="text-cyan-400">LAB</span>
            </h1>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800/80">
          <Link href="/" className="px-4 py-1.5 text-xs font-semibold text-cyan-400 bg-slate-800 rounded-lg shadow-sm">Dashboard</Link>
          <Link href="/tools/centrifugal-pump" className="px-4 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 rounded-lg transition-all">Pump Analysis</Link>
          <Link href="/tools/beam-buckling" className="px-4 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 rounded-lg transition-all">Beam Buckling</Link>
          <Link href="/tools/heat-transfer" className="px-4 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 rounded-lg transition-all">Heat Transfer</Link>
          <a href="#" className="px-4 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 rounded-lg transition-all">API Docs</a>
        </nav>

        {/* Action Icons */}
        <div className="flex items-center gap-2">
          <button className="p-2 text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors relative">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400" />
          </button>
          <button className="p-2 text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors">
            <Terminal className="w-4 h-4" />
          </button>
          
          <div className="h-6 w-px bg-slate-800 mx-1 hidden sm:block" />

          {/* Profile Badge */}
          <div className="flex items-center gap-2 pl-1 cursor-pointer">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-500 p-0.5">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center font-mono text-xs font-bold text-cyan-400">
                ME
              </div>
            </div>
          </div>
        </div>

      </div>
    </header>
  );
}

// Dynamic Interactive Tool Card Component
function ToolCard({ tool }) {
  const Icon = tool.icon;

  return (
    <div className={`group relative bg-slate-900/60 border rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between overflow-hidden ${
      tool.isReady 
        ? 'border-slate-800/90 hover:border-slate-700 hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-950/40' 
        : 'border-slate-800/50 opacity-80'
    }`}>
      
      {/* Decorative Card Accent Gradient */}
      <div className={`absolute top-0 right-0 w-full h-32 bg-gradient-to-bl ${tool.accentGradient} opacity-60 pointer-events-none rounded-t-2xl`} />

      <div>
        {/* Top Header Row */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${tool.iconBg} shadow-inner`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-mono tracking-wider text-slate-400 uppercase">
                {tool.category}
              </span>
            </div>
          </div>

          <span className={`text-[11px] font-mono px-2.5 py-1 rounded-full border ${tool.badgeColor} flex items-center gap-1.5`}>
            {tool.isReady ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Clock className="w-3 h-3 text-amber-400" />}
            {tool.status}
          </span>
        </div>

        {/* Title & Description */}
        <h3 className={`text-xl font-bold mb-2 transition-colors ${tool.isReady ? 'text-slate-100 group-hover:text-cyan-400' : 'text-slate-300'}`}>
          {tool.title}
        </h3>
        <p className="text-sm text-slate-400 leading-relaxed mb-6 line-clamp-2">
          {tool.description}
        </p>
      </div>

      {/* Bottom Formula & Action CTA */}
      <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-4">
        
        {/* Formatted Governing Formula */}
        <div className="bg-slate-950/80 border border-slate-800/80 px-3 py-1.5 rounded-lg text-xs font-mono text-cyan-300/90 shadow-inner overflow-x-auto max-w-[200px] sm:max-w-none">
          <code>{tool.formula}</code>
        </div>

        {/* Launch Button or Disabled Indicator */}
        {tool.isReady ? (
          <Link 
            href={tool.href}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 group-hover:text-cyan-400 transition-colors bg-slate-800/50 group-hover:bg-cyan-500/10 px-3.5 py-2 rounded-xl border border-slate-700/50 group-hover:border-cyan-500/30"
          >
            Launch Module <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        ) : (
          <button 
            disabled 
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-900/50 px-3.5 py-2 rounded-xl border border-slate-800 cursor-not-allowed"
          >
            <Lock className="w-3 h-3" /> Coming Soon
          </button>
        )}

      </div>
    </div>
  );
}