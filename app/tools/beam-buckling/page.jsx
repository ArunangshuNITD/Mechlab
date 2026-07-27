"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Play, 
  RotateCcw, 
  ShieldCheck, 
  AlertTriangle, 
  Activity, 
  Ruler,
  Zap,
  Sliders,
  ArrowRight,
  Gauge,
  Sparkles,
  Bot
} from 'lucide-react';

export default function BeamBucklingPage() {
  // Input parameters (P_kn starts at 0 for straight state)
  const [inputs, setInputs] = useState({
    E_gpa: 210,        // Young's Modulus (Structural Steel)
    I_cm4: 1620,       // Moment of Inertia
    A_cm2: 42.5,       // Cross-sectional Area
    L_m: 4.5,          // Length
    P_kn: 0,           // Initial applied load = 0 kN (Straight beam)
    condition: 'pinned_pinned'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pythonResult, setPythonResult] = useState(null);

  // Gemini AI States
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  // Real-time local calculation engine for smooth animations and instant feedback
  const computedData = useMemo(() => {
    const E = (Number(inputs.E_gpa) || 0) * 1e9;  // Pa
    const I = (Number(inputs.I_cm4) || 0) * 1e-8; // m4
    const A = (Number(inputs.A_cm2) || 0) * 1e-4; // m2
    const L = Number(inputs.L_m) || 1.0;          // m
    const P = Number(inputs.P_kn) || 0;           // kN

    const K_map = {
      pinned_pinned: 1.0,
      fixed_fixed: 0.5,
      fixed_pinned: 0.7,
      fixed_free: 2.0
    };
    const K = K_map[inputs.condition] || 1.0;
    const Le = K * L;

    if (E <= 0 || I <= 0 || A <= 0 || L <= 0) {
      return null;
    }

    // Euler Critical Load P_cr = (pi^2 * E * I) / (Le^2)
    const P_cr_N = (Math.PI ** 2 * E * I) / (Le ** 2);
    const P_cr_kn = P_cr_N / 1000;
    const sigma_cr_mpa = (P_cr_N / A) / 1e6;
    const r_m = Math.sqrt(I / A);
    const r_mm = r_m * 1000;
    const slenderness = Le / r_m;

    const isBuckled = P > 0 && P >= P_cr_kn;
    const safety_factor = P > 0 ? (P_cr_kn / P).toFixed(2) : "∞";

    // Generate deflection curve points (50 points along span)
    const points = [];
    const numPoints = 50;
    for (let i = 0; i < numPoints; i++) {
      const x_ratio = i / (numPoints - 1);
      let deflection = 0;

      if (P > 0) {
        // Support-condition specific mode shapes
        if (inputs.condition === 'fixed_fixed') {
          deflection = 0.5 * (1 - Math.cos(2 * Math.PI * x_ratio));
        } else if (inputs.condition === 'fixed_free') {
          deflection = 1 - Math.cos((Math.PI * x_ratio) / 2);
        } else if (inputs.condition === 'fixed_pinned') {
          deflection = 0.5 * (1 - Math.cos(1.43 * Math.PI * x_ratio));
        } else {
          // pinned_pinned
          deflection = Math.sin(Math.PI * x_ratio);
        }
      }

      points.push({ x_ratio, deflection });
    }

    return {
      P_cr_kn: P_cr_kn.toFixed(1),
      sigma_cr_mpa: sigma_cr_mpa.toFixed(1),
      slenderness: slenderness.toFixed(1),
      effective_length_m: Le.toFixed(2),
      radius_of_gyration_mm: r_mm.toFixed(1),
      K_factor: K,
      isBuckled,
      safety_factor,
      curve_points: points
    };
  }, [inputs]);

  // Use Python backend result if available, otherwise fallback to local real-time computation
  const activeResult = pythonResult || computedData;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setInputs(prev => ({ 
      ...prev, 
      [name]: value === '' ? '' : (name === 'condition' ? value : Number(value)) 
    }));
    // Reset server python result on input edit so real-time computation takes over
    if (pythonResult) setPythonResult(null);
  };

  const runPythonSolver = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/buckling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputs)
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setPythonResult(data);
      }
    } catch (err) {
      // Fallback silently to computedData on API unavailability
      setError("Backend server API offline. Using real-time calculation client.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAiAnalysis = async () => {
    if (!activeResult) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs, result: activeResult })
      });
      const data = await res.json();
      if (data.error) {
        setAiError(data.error);
      } else if (data.analysis) {
        setAiAnalysis(data.analysis);
      }
    } catch (err) {
      setAiError("Failed to connect to AI Advisor service.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleReset = () => {
    setInputs({
      E_gpa: 210,
      I_cm4: 1620,
      A_cm2: 42.5,
      L_m: 4.5,
      P_kn: 0,
      condition: 'pinned_pinned'
    });
    setPythonResult(null);
    setError(null);
    setAiAnalysis(null);
    setAiError(null);
  };

  // Compute animated SVG path string dynamically
  const getSvgPathString = () => {
    if (!activeResult || !activeResult.curve_points) return "M 0 50 L 500 50";

    const loadRatio = inputs.P_kn / (parseFloat(activeResult.P_cr_kn) || 1);
    const amplitude = inputs.P_kn > 0 ? Math.min(Math.max(loadRatio * 28, 6), 42) : 0;

    return activeResult.curve_points.reduce((acc, pt, idx) => {
      const x = pt.x_ratio * 500;
      const y = 50 - (pt.deflection * amplitude);
      return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  };

  const isBuckled = activeResult?.isBuckled ?? false;
  const maxSliderValue = activeResult ? Math.ceil(parseFloat(activeResult.P_cr_kn) * 1.5) : 1000;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-950">
      
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/" 
              className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-mono text-[10px] uppercase font-semibold">
                  Solid Mechanics
                </span>
                <span className="text-slate-500 text-xs font-mono">• Interactive Solver</span>
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Beam Buckling & Stress Visualizer
              </h1>
            </div>
          </div>

          <button 
            onClick={runPythonSolver}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-cyan-500/25 transition-all hover:scale-[1.03] active:scale-95 disabled:opacity-50"
          >
            {loading ? <Activity className="w-4 h-4 animate-spin text-slate-950" /> : <Play className="w-4 h-4 fill-slate-950" />}
            {loading ? 'Computing...' : 'Run Server Solver'}
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Governing Formula Banner */}
        <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
            <div>
              <h2 className="text-sm font-semibold text-slate-300 font-mono uppercase tracking-wider mb-1 flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                Euler Critical Buckling Formula
              </h2>
              <p className="text-slate-400 text-xs max-w-xl">
                Determines the maximum axial force <strong>P<sub>cr</sub></strong> a column can support before undergoing lateral elastic buckling deflection.
              </p>
            </div>
            <div className="bg-slate-950/90 border border-slate-800 px-6 py-3 rounded-xl font-mono text-cyan-300 text-base shadow-inner">
              P<sub>cr</sub> = &pi;<sup>2</sup> E I / (K L)<sup>2</sup>
            </div>
          </div>
        </section>

        {/* Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Input Control Deck (5 cols) */}
          <div className="lg:col-span-5 bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="font-semibold text-white text-base flex items-center gap-2">
                <Ruler className="w-4 h-4 text-cyan-400" />
                Parameter Configuration
              </h3>
              <button 
                onClick={handleReset}
                className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>

            <div className="space-y-5 text-xs font-mono">
              
              {/* Interactive Load Slider */}
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800/80 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-cyan-400" /> Applied Load (P<sub>applied</sub>)
                  </span>
                  <span className={`text-sm font-bold px-2.5 py-0.5 rounded-lg ${
                    inputs.P_kn === 0 
                      ? 'bg-slate-800 text-slate-400' 
                      : isBuckled 
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                        : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  }`}>
                    {inputs.P_kn} kN
                  </span>
                </div>
                
                <input 
                  type="range" 
                  min="0" 
                  max={maxSliderValue} 
                  step="5"
                  name="P_kn" 
                  value={inputs.P_kn} 
                  onChange={handleInputChange}
                  className="w-full accent-cyan-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
                />

                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>0 kN (Neutral)</span>
                  {activeResult && <span className="text-amber-400 font-bold">P<sub>cr</sub>: {activeResult.P_cr_kn} kN</span>}
                  <span>{maxSliderValue} kN</span>
                </div>
              </div>

              {/* End Support Conditions */}
              <div>
                <label className="block text-slate-400 mb-1.5">End Support Condition (K Factor)</label>
                <select 
                  name="condition" 
                  value={inputs.condition} 
                  onChange={handleInputChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="pinned_pinned">Pinned - Pinned (K = 1.0)</option>
                  <option value="fixed_fixed">Fixed - Fixed (K = 0.5)</option>
                  <option value="fixed_pinned">Fixed - Pinned (K = 0.7)</option>
                  <option value="fixed_free">Fixed - Free / Cantilever (K = 2.0)</option>
                </select>
              </div>

              {/* Young's Modulus E */}
              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Young's Modulus (E)</span>
                  <span className="text-cyan-400 font-bold">{inputs.E_gpa} GPa</span>
                </div>
                <input 
                  type="number" 
                  name="E_gpa" 
                  value={inputs.E_gpa} 
                  onChange={handleInputChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              {/* Moment of Inertia I */}
              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Second Moment of Area (I)</span>
                  <span className="text-cyan-400 font-bold">{inputs.I_cm4} cm⁴</span>
                </div>
                <input 
                  type="number" 
                  name="I_cm4" 
                  value={inputs.I_cm4} 
                  onChange={handleInputChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              {/* Cross Section Area A */}
              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Cross-Sectional Area (A)</span>
                  <span className="text-cyan-400 font-bold">{inputs.A_cm2} cm²</span>
                </div>
                <input 
                  type="number" 
                  name="A_cm2" 
                  value={inputs.A_cm2} 
                  onChange={handleInputChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              {/* Length L */}
              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Column Unbraced Length (L)</span>
                  <span className="text-cyan-400 font-bold">{inputs.L_m} meters</span>
                </div>
                <input 
                  type="number" 
                  step="0.1"
                  name="L_m" 
                  value={inputs.L_m} 
                  onChange={handleInputChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
              </div>

            </div>

            <button 
              onClick={runPythonSolver}
              className="w-full bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 font-semibold py-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
            >
              <Zap className="w-3.5 h-3.5" /> Execute Server Calculation
            </button>
          </div>

          {/* Right Column: Dynamic Simulation Canvas & Metrics (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Interactive Animated SVG Beam Visualizer */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-mono uppercase text-slate-300 font-semibold flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-cyan-400" />
                  Real-Time Mode Shape & Deflection Curve
                </h4>
                <span className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full border ${
                  inputs.P_kn === 0 
                    ? 'border-slate-700 bg-slate-800 text-slate-400' 
                    : isBuckled 
                      ? 'border-rose-500/40 bg-rose-950/60 text-rose-400 animate-pulse' 
                      : 'border-cyan-500/40 bg-cyan-950/60 text-cyan-400'
                }`}>
                  {inputs.P_kn === 0 ? 'State: Zero Load (Neutral)' : isBuckled ? 'State: BUCKLED' : 'State: Stable Deflection'}
                </span>
              </div>

              {/* Simulation Canvas Container */}
              <div className="h-64 w-full bg-slate-950 rounded-xl border border-slate-800/90 p-6 relative flex flex-col justify-between overflow-hidden shadow-2xl">
                
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:2rem_2rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />

                {/* Left Force Vector Arrow */}
                <div className={`absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1 z-20 transition-all duration-300 ${
                  inputs.P_kn === 0 ? 'opacity-20 translate-x-[-8px]' : 'opacity-100 translate-x-0'
                }`}>
                  <div className="text-[10px] font-mono font-bold text-cyan-400 bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-800">
                    P = {inputs.P_kn} kN
                  </div>
                  <ArrowRight className={`w-6 h-6 transition-transform ${
                    isBuckled ? 'text-rose-500 animate-bounce' : 'text-cyan-400'
                  }`} />
                </div>

                {/* Right Force Vector Arrow */}
                <div className={`absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 z-20 transition-all duration-300 ${
                  inputs.P_kn === 0 ? 'opacity-20 translate-x-[8px]' : 'opacity-100 translate-x-0'
                }`}>
                  <ArrowLeft className={`w-6 h-6 transition-transform ${
                    isBuckled ? 'text-rose-500 animate-bounce' : 'text-cyan-400'
                  }`} />
                  <div className="text-[10px] font-mono font-bold text-cyan-400 bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-800">
                    Reaction
                  </div>
                </div>

                {/* Central Beam SVG */}
                <div className="my-auto relative w-full h-28 flex items-center justify-center">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 500 100" preserveAspectRatio="none">
                    <line x1="0" y1="50" x2="500" y2="50" stroke="#334155" strokeDasharray="6 6" strokeWidth="1.5" />
                    <path
                      d={getSvgPathString()}
                      fill="none"
                      stroke={inputs.P_kn === 0 ? "#64748b" : isBuckled ? "#f43f5e" : "#06b6d4"}
                      strokeWidth={isBuckled ? "4" : "3"}
                      className="transition-all duration-300 ease-out"
                      style={{
                        filter: isBuckled ? 'drop-shadow(0 0 10px rgba(244, 63, 94, 0.6))' : 'drop-shadow(0 0 8px rgba(6, 182, 212, 0.4))'
                      }}
                    />
                    {inputs.P_kn > 0 && (
                      <circle 
                        cx="250" 
                        cy={50 - (activeResult ? Math.min(Math.max((inputs.P_kn / parseFloat(activeResult.P_cr_kn)) * 28, 6), 42) : 15)} 
                        r="5" 
                        fill={isBuckled ? "#f43f5e" : "#06b6d4"}
                        className="transition-all duration-300 ease-out animate-pulse"
                      />
                    )}
                  </svg>

                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-12 bg-slate-800 border border-slate-700 rounded-sm shadow-md" />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-12 bg-slate-800 border border-slate-700 rounded-sm shadow-md" />
                </div>

                <div className="flex justify-between text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-900">
                  <span>x = 0 (Base Support)</span>
                  <span className="text-slate-400">x = {(inputs.L_m / 2).toFixed(2)}m (Mid-span Deflection)</span>
                  <span>x = {inputs.L_m}m (Top Support)</span>
                </div>
              </div>
            </div>

            {/* Error Message Display */}
            {error && (
              <div className="bg-red-950/40 border border-red-500/50 p-4 rounded-xl text-red-400 text-xs flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Results Display Area */}
            {activeResult && (
              <>
                {/* Buckling Status Indicator Banner */}
                <div className={`p-6 rounded-2xl border transition-all duration-500 ${
                  isBuckled 
                    ? 'bg-rose-950/30 border-rose-500/50 text-rose-300 shadow-xl shadow-rose-950/20' 
                    : 'bg-emerald-950/30 border-emerald-500/50 text-emerald-300 shadow-xl shadow-emerald-950/20'
                } flex items-center justify-between`}>
                  <div className="space-y-1">
                    <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                      Buckling Safety Analysis
                    </span>
                    <h3 className="text-2xl font-bold flex items-center gap-2">
                      {isBuckled ? (
                        <>
                          <AlertTriangle className="w-6 h-6 text-rose-500 animate-bounce" /> 
                          <span className="text-rose-400">COLUMN BUCKLED (UNSAFE)</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-6 h-6 text-emerald-400" /> 
                          <span className="text-emerald-400">STRUCTURALLY STABLE</span>
                        </>
                      )}
                    </h3>
                  </div>

                  <div className="text-right font-mono">
                    <div className="text-xs text-slate-400">Factor of Safety</div>
                    <div className={`text-3xl font-extrabold ${isBuckled ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {activeResult.safety_factor}
                    </div>
                  </div>
                </div>

                {/* Key Metrics Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 font-mono">
                  <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
                    <div className="text-xs text-slate-500 mb-1">Critical Load (P<sub>cr</sub>)</div>
                    <div className="text-xl font-bold text-cyan-400">{activeResult.P_cr_kn} kN</div>
                  </div>
                  <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
                    <div className="text-xs text-slate-500 mb-1">Critical Stress (&sigma;<sub>cr</sub>)</div>
                    <div className="text-xl font-bold text-slate-200">{activeResult.sigma_cr_mpa} MPa</div>
                  </div>
                  <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
                    <div className="text-xs text-slate-500 mb-1">Slenderness (&lambda;)</div>
                    <div className="text-xl font-bold text-slate-200">{activeResult.slenderness}</div>
                  </div>
                  <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
                    <div className="text-xs text-slate-500 mb-1">Effective Length (L<sub>e</sub>)</div>
                    <div className="text-xl font-bold text-slate-200">{activeResult.effective_length_m} m</div>
                  </div>
                  <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
                    <div className="text-xs text-slate-500 mb-1">Radius of Gyration (r)</div>
                    <div className="text-xl font-bold text-slate-200">{activeResult.radius_of_gyration_mm} mm</div>
                  </div>
                  <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
                    <div className="text-xs text-slate-500 mb-1">K-Factor</div>
                    <div className="text-xl font-bold text-slate-200">{activeResult.K_factor}</div>
                  </div>
                </div>

                {/* Gemini AI Advisor Section */}
                <div className="bg-slate-900/80 border border-cyan-500/30 rounded-2xl p-6 space-y-4 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-cyan-500/10 rounded-xl text-cyan-400 border border-cyan-500/20">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Gemini Structural Advisor</h4>
                        <p className="text-[10px] text-slate-400 font-mono">AI Failure Analysis & Design Recommendations</p>
                      </div>
                    </div>

                    <button
                      onClick={fetchAiAnalysis}
                      disabled={aiLoading}
                      className="px-3.5 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-mono font-semibold transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {aiLoading ? <Activity className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
                      {aiLoading ? "Analyzing..." : "Generate AI Insights"}
                    </button>
                  </div>

                  {aiError && (
                    <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-rose-400 text-xs">
                      {aiError}
                    </div>
                  )}

                  {aiAnalysis && (
                    <div className="mt-4 pt-4 border-t border-slate-800/80 text-xs text-slate-300 leading-relaxed whitespace-pre-line space-y-2 bg-slate-950/70 p-4 rounded-xl border border-slate-800/90 font-mono">
                      {aiAnalysis}
                    </div>
                  )}
                </div>
              </>
            )}

          </div>

        </div>

      </main>
    </div>
  );
}