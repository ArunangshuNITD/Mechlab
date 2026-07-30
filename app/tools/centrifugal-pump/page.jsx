"use client";

import React, { useState, useMemo, useEffect } from "react";
import ToolInstructions from '@/app/components/ToolInstructions';
import { analyzePump, FLUID_PRESETS } from "@/lib/centrifugal-pump";
import { Bot } from 'lucide-react';

export default function CentrifugalPumpStudio() {
  // Mode & Tabs State
  const [activeTab, setActiveTab] = useState("operational"); // 'operational' | 'geometry' | 'fluid'

  // Input Parameters State
  const [fluidKey, setFluidKey] = useState("water20");
  const [flowRate, setFlowRate] = useState(50); // m³/h
  const [rpm, setRpm] = useState(2900); // RPM
  const [suctionHead, setSuctionHead] = useState(3.0); // m (Suction Lift)
  const [deliveryHead, setDeliveryHead] = useState(25.0); // m
  const [suctionLength, setSuctionLength] = useState(12.0); // m
  const [deliveryLength, setDeliveryLength] = useState(60.0); // m
  const [suctionDiameter, setSuctionDiameter] = useState(0.08); // m (80 mm)
  const [deliveryDiameter, setDeliveryDiameter] = useState(0.065); // m (65 mm)
  const [impellerDiameter, setImpellerDiameter] = useState(0.22); // m (220 mm)
  const [impellerWidth, setImpellerWidth] = useState(0.015); // m (15 mm)
  const [bladeAngle, setBladeAngle] = useState(25); // deg
  const [npshr, setNpshr] = useState(2.2); // m

  // Calculate Pump Metrics dynamically
  const fluid = FLUID_PRESETS[fluidKey];
  const results = useMemo(() => {
    return analyzePump({
      density: fluid.density,
      viscosity: fluid.viscosity,
      vaporPressure: fluid.vaporPressure,
      flowRate,
      rpm,
      suctionHead,
      deliveryHead,
      suctionLength,
      deliveryLength,
      suctionDiameter,
      deliveryDiameter,
      impellerDiameter,
      impellerWidth,
      bladeAngle,
      npshr,
    });
  }, [
    fluidKey,
    flowRate,
    rpm,
    suctionHead,
    deliveryHead,
    suctionLength,
    deliveryLength,
    suctionDiameter,
    deliveryDiameter,
    impellerDiameter,
    impellerWidth,
    bladeAngle,
    npshr,
  ]);

  // AI Insights Generation
  const aiInsights = useMemo(() => {
    const insights = [];
    
    if (!results.npsh.safe) {
      insights.push({
        type: "danger",
        title: "High Risk of Cavitation Detected",
        message: `NPSH Available (${results.npsh.npsha} m) is dangerously close or lower than NPSH Required (${results.npsh.npshr} m). Lower the suction lift (${suctionHead} m) or increase suction pipe diameter (${suctionDiameter * 1000} mm).`,
      });
    } else {
      insights.push({
        type: "success",
        title: "Safe NPSH Cavitation Margin",
        message: `NPSH Available is ${results.npsh.npsha} m, offering a safe ${results.npsh.margin} m buffer above NPSHr (${results.npsh.npshr} m).`,
      });
    }

    if (results.velocities.Vs > 2.5) {
      insights.push({
        type: "warning",
        title: "High Suction Velocity",
        message: `Suction velocity is ${results.velocities.Vs} m/s (Recommended: < 2.0 m/s). This increases friction losses (${results.losses.hfs} m) and cavitation risks.`,
      });
    }

    if (results.efficiencies.overall > 75) {
      insights.push({
        type: "info",
        title: "Optimal Pump Efficiency Operating Point",
        message: `Operating at an overall efficiency of ${results.efficiencies.overall}%. Recommended motor power rating: ${Math.ceil(results.powers.shaftPower * 1.2)} kW.`,
      });
    } else {
      insights.push({
        type: "warning",
        title: "Sub-Optimal Operating Efficiency",
        message: `Overall efficiency is currently ${results.efficiencies.overall}%. Consider adjusting impeller geometry or system flow demand to optimize power consumption.`,
      });
    }

    return insights;
  }, [results, suctionHead, suctionDiameter]);

  const [aiAnalysis, setAiAnalysis] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const generateFallbackAiAnalysisPump = (errorMessage) => {
    return (
      `**GEMINI HYDRAULIC DIAGNOSTIC & ADVISORY**\n\n` +
      `• **Operating Point:** Q=${flowRate} m³/h @ N=${rpm} RPM | TDH=${results.heads.tdh} m\n` +
      `• **NPSH:** Available=${results.npsh.npsha} m | Required=${results.npsh.npshr} m | Margin=${results.npsh.margin} m\n\n` +
      `• **Immediate Recommendations:**\n  - ${results.npsh.safe ? 'Operating NPSH margin is acceptable.' : 'Increase suction diameter or reduce suction lift to reduce cavitation risk.'}\n  - ${results.velocities.Vs > 2.5 ? 'Reduce suction velocity to lower friction losses.' : 'Suction velocity within recommended range.'}` +
      (errorMessage ? `\n\n*Fallback insight generated because AI route failed: ${errorMessage}*` : '')
    );
  };

  const fetchAiAnalysisPump = async () => {
    setAiLoading(true); setAiAnalysis('');
    try {
      const response = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs: {
            flowRate, rpm, suctionHead, deliveryHead, suctionLength, deliveryLength,
            suctionDiameter, deliveryDiameter, impellerDiameter, impellerWidth, bladeAngle, npshr, fluidKey
          },
          result: { heads: results.heads, npsh: results.npsh, efficiencies: results.efficiencies },
          tool: 'centrifugal-pump'
        })
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || `AI returned ${response.status}`);
      setAiAnalysis(data.analysis || generateFallbackAiAnalysisPump('AI returned no analysis'));
    } catch (err) {
      console.warn('[AI pump] fallback', err?.message || err);
      setAiAnalysis(generateFallbackAiAnalysisPump(err?.message || 'Unknown'));
    } finally { setAiLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 p-4 md:p-8 font-sans">
      {/* Header */}
      <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-1 bg-cyan-400 rounded-full"></div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span className="text-cyan-400 font-mono">⚡</span> Centrifugal Pump Hydrodynamics Studio
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time Total Dynamic Head (TDH), NPSH Cavitation Analysis, System Head Curves & Hydraulics Analysis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => {
            const payload = { inputs: { flowRate, rpm, suctionHead, deliveryHead, suctionLength, deliveryLength, suctionDiameter, deliveryDiameter, impellerDiameter, impellerWidth, bladeAngle, npshr }, fluidKey, results };
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'centrifugal-pump-results.json'; a.click(); URL.revokeObjectURL(url);
          }} className="text-xs px-3 py-1 rounded-md bg-slate-800/60 hover:bg-slate-800/80 border border-slate-700 text-slate-200">Export Results</button>
        </div>

        {/* Global Regime / Tab Switcher */}
        <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab("operational")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "operational"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            1. Operating Parameters
          </button>
          <button
            onClick={() => setActiveTab("geometry")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "geometry"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            2. Piping & Impeller Geometry
          </button>
          <button
            onClick={() => setActiveTab("fluid")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "fluid"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            3. Fluid Properties
          </button>
        </div>
      </header>

      <ToolInstructions
        title="Centrifugal Pump"
        subtitle="Use the tabs to switch between operating parameters, geometry, and fluid properties. Adjust flow, speed and piping dimensions to see TDH, NPSH margin and efficiency update live."
        quick="1. Set operating point · 2. Tune geometry · 3. Check NPSH"
        steps={[
          'Start with an expected flow and RPM for your system.',
          'Check NPSH availability — increase suction diameter or reduce lift if margin is low.',
          'Optimize impeller geometry and speed to improve efficiency and reduce shaft power.'
        ]}
      />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Input Parameter Controls */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Status Badge */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              results.npsh.safe
                ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
                : "bg-rose-950/40 border-rose-500/50 text-rose-300"
            }`}
          >
            <div className="text-xs uppercase tracking-wider font-semibold opacity-75">
              System Hydraulic Status
            </div>
            <div className="flex justify-between items-end mt-1">
              <span className="text-xl font-bold flex items-center gap-2">
                {results.npsh.safe ? "✅ HYDRODYNAMICAL SAFE" : "⚠️ CAVITATION RISK HIGH"}
              </span>
              <span className="text-2xl font-mono font-extrabold">
                {results.heads.tdh} <span className="text-xs font-normal">m TDH</span>
              </span>
            </div>
            <div className="text-xs mt-2 opacity-80 flex justify-between">
              <span>NPSH Margin: {results.npsh.margin} m</span>
              <span>Shaft Power: {results.powers.shaftPower} kW</span>
            </div>
          </div>

          {/* Control Panel Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-5 backdrop-blur-md">
            
            {activeTab === "operational" && (
              <>
                <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider border-b border-slate-800 pb-2">
                  ⚙️ Flow & Speed Settings
                </h3>

                {/* Flow Rate */}
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-slate-300">Target Flow Rate (Q)</span>
                    <span className="text-cyan-400 font-bold">{flowRate} m³/h</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="150"
                    value={flowRate}
                    onChange={(e) => setFlowRate(Number(e.target.value))}
                    className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Pump Speed */}
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-slate-300">Pump Rotational Speed (N)</span>
                    <span className="text-cyan-400 font-bold">{rpm} RPM</span>
                  </div>
                  <input
                    type="range"
                    min="1000"
                    max="3600"
                    step="50"
                    value={rpm}
                    onChange={(e) => setRpm(Number(e.target.value))}
                    className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Suction Lift */}
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-slate-300">Suction Static Lift (Hs)</span>
                    <span className="text-cyan-400 font-bold">{suctionHead} m</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="8"
                    step="0.2"
                    value={suctionHead}
                    onChange={(e) => setSuctionHead(Number(e.target.value))}
                    className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Delivery Head */}
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-slate-300">Delivery Static Head (Hd)</span>
                    <span className="text-cyan-400 font-bold">{deliveryHead} m</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="60"
                    step="0.5"
                    value={deliveryHead}
                    onChange={(e) => setDeliveryHead(Number(e.target.value))}
                    className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </>
            )}

            {activeTab === "geometry" && (
              <>
                <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider border-b border-slate-800 pb-2">
                  📏 Piping & Impeller Specifications
                </h3>

                {/* Suction Length */}
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-slate-300">Suction Pipe Length (Ls)</span>
                    <span className="text-cyan-400 font-bold">{suctionLength} m</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="40"
                    value={suctionLength}
                    onChange={(e) => setSuctionLength(Number(e.target.value))}
                    className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Delivery Length */}
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-slate-300">Delivery Pipe Length (Ld)</span>
                    <span className="text-cyan-400 font-bold">{deliveryLength} m</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="200"
                    value={deliveryLength}
                    onChange={(e) => setDeliveryLength(Number(e.target.value))}
                    className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Suction Diameter */}
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-slate-300">Suction Pipe Inner Diameter (Ds)</span>
                    <span className="text-cyan-400 font-bold">{Math.round(suctionDiameter * 1000)} mm</span>
                  </div>
                  <input
                    type="range"
                    min="0.04"
                    max="0.20"
                    step="0.005"
                    value={suctionDiameter}
                    onChange={(e) => setSuctionDiameter(Number(e.target.value))}
                    className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Delivery Diameter */}
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-slate-300">Delivery Pipe Inner Diameter (Dd)</span>
                    <span className="text-cyan-400 font-bold">{Math.round(deliveryDiameter * 1000)} mm</span>
                  </div>
                  <input
                    type="range"
                    min="0.03"
                    max="0.15"
                    step="0.005"
                    value={deliveryDiameter}
                    onChange={(e) => setDeliveryDiameter(Number(e.target.value))}
                    className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Impeller Outer Diameter */}
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-slate-300">Impeller Diameter (D2)</span>
                    <span className="text-cyan-400 font-bold">{Math.round(impellerDiameter * 1000)} mm</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.4"
                    step="0.01"
                    value={impellerDiameter}
                    onChange={(e) => setImpellerDiameter(Number(e.target.value))}
                    className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </>
            )}

            {activeTab === "fluid" && (
              <>
                <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider border-b border-slate-800 pb-2">
                  💧 Fluid Medium
                </h3>
                <div className="space-y-2">
                  {Object.entries(FLUID_PRESETS).map(([key, data]) => (
                    <button
                      key={key}
                      onClick={() => setFluidKey(key)}
                      className={`w-full text-left p-3 rounded-lg text-xs font-mono transition-all border ${
                        fluidKey === key
                          ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                          : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <div className="font-bold">{data.name}</div>
                      <div className="text-[10px] opacity-75 mt-0.5">
                        Density: {data.density} kg/m³ | Pvp: {data.vaporPressure} Pa
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Analytical Metrics Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-3 font-mono text-xs">
            <h3 className="text-slate-300 font-bold uppercase border-b border-slate-800 pb-2">
              📊 Key Hydraulic Output Metrics
            </h3>
            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-400">Static Head (Hs + Hd)</span>
              <span className="text-white font-bold">{results.heads.staticHead} m</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-400">Total Friction Losses (hfs + hfd)</span>
              <span className="text-cyan-400 font-bold">{results.losses.totalFriction} m</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-400">Suction Pipe Velocity (Vs)</span>
              <span className="text-white font-bold">{results.velocities.Vs} m/s</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-400">Delivery Pipe Velocity (Vd)</span>
              <span className="text-white font-bold">{results.velocities.Vd} m/s</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-400">Impeller Peripheral Velocity (U2)</span>
              <span className="text-white font-bold">{results.impellerSpeed} m/s</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-400">NPSH Available (NPSHa)</span>
              <span className={results.npsh.safe ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                {results.npsh.npsha} m
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Overall Pump Efficiency</span>
              <span className="text-cyan-300 font-bold">{results.efficiencies.overall}%</span>
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic System Diagram + Charts + AI Insights */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* 1. Dynamic Interactive Piping & Hydraulic System SVG */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 backdrop-blur-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                <span>📐</span> Interactive Hydraulic Piping System Diagram
              </h2>
              <span className="text-xs font-mono bg-cyan-950/60 text-cyan-300 px-2.5 py-1 rounded border border-cyan-800/50">
                Live Dimension Scaler
              </span>
            </div>

            {/* SVG Interactive Canvas */}
            <div className="w-full h-80 bg-[#070A10] rounded-xl border border-slate-800/80 relative overflow-hidden flex items-center justify-center">
              <svg className="w-full h-full" viewBox="0 0 800 360" preserveAspectRatio="xMidYMid meet">
                <defs>
                  {/* Fluid Gradient */}
                  <linearGradient id="fluidGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#00F2FE" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#4FACFE" stopOpacity="0.8" />
                  </linearGradient>
                  {/* Energy Line Gradient */}
                  <linearGradient id="eglGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#EF4444" stopOpacity="0.8" />
                  </linearGradient>
                </defs>

                {/* Grid Background Lines */}
                <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1E293B" strokeWidth="0.5" />
                </pattern>
                <rect width="800" height="360" fill="url(#grid)" />

                {/* Sump Reservoir (Bottom Left) */}
                <rect x="60" y="240" width="120" height="90" fill="#0F172A" stroke="#334155" strokeWidth="2" rx="4" />
                {/* Water Level in Sump */}
                <rect x="62" y="260" width="116" height="68" fill="url(#fluidGrad)" opacity="0.4" />
                <line x1="62" y1="260" x2="178" y2="260" stroke="#00F2FE" strokeWidth="2" strokeDasharray="4 2" />
                <text x="120" y="285" fill="#94A3B8" fontSize="10" textAnchor="middle" fontFamily="monospace">
                  Sump Reservoir
                </text>

                {/* Suction Pipe (Vertical lift from sump to pump) */}
                <path
                  d="M 120 280 L 120 180 L 250 180"
                  fill="none"
                  stroke="#00F2FE"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.85"
                />
                <path
                  d="M 120 280 L 120 180 L 250 180"
                  fill="none"
                  stroke="#1E293B"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Centrifugal Pump Icon Assembly */}
                <g transform="translate(260, 180)">
                  {/* Volute Casing */}
                  <circle cx="0" cy="0" r="32" fill="#1E293B" stroke="#00F2FE" strokeWidth="3" />
                  {/* Rotating Impeller Blades */}
                  <g className="animate-spin" style={{ transformOrigin: "0px 0px", animationDuration: `${3000 / rpm}s` }}>
                    <line x1="-20" y1="0" x2="20" y2="0" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
                    <line x1="0" y1="-20" x2="0" y2="20" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
                    <circle cx="0" cy="0" r="8" fill="#00F2FE" />
                  </g>
                  <text x="0" y="48" fill="#00F2FE" fontSize="11" textAnchor="middle" fontWeight="bold" fontFamily="monospace">
                    PUMP ({rpm} RPM)
                  </text>
                </g>

                {/* Delivery Pipe (Vertical + Horizontal run to destination) */}
                <path
                  d={`M 260 148 L 260 ${Math.max(50, 180 - deliveryHead * 3)} L ${Math.min(720, 260 + deliveryLength * 5)} ${Math.max(50, 180 - deliveryHead * 3)}`}
                  fill="none"
                  stroke="#38BDF8"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Destination Tank */}
                <g transform={`translate(${Math.min(680, 240 + deliveryLength * 5)}, ${Math.max(30, 160 - deliveryHead * 3)})`}>
                  <rect x="0" y="0" width="80" height="70" fill="#0F172A" stroke="#334155" strokeWidth="2" rx="4" />
                  <rect x="2" y="20" width="76" height="48" fill="url(#fluidGrad)" opacity="0.5" />
                  <text x="40" y="45" fill="#94A3B8" fontSize="9" textAnchor="middle" fontFamily="monospace">
                    Discharge
                  </text>
                </g>

                {/* Energy Grade Line (EGL) Visualization */}
                <path
                  d={`M 120 260 L 260 180 L 260 ${Math.max(40, 170 - results.heads.tdh * 3.5)} L 720 ${Math.max(40, 170 - results.heads.tdh * 3.5 + results.losses.hfd * 3)}`}
                  fill="none"
                  stroke="url(#eglGrad)"
                  strokeWidth="2"
                  strokeDasharray="5 3"
                />

                {/* Dimension Annotations & Labels */}
                {/* Hs Annotation */}
                <line x1="100" y1="260" x2="100" y2="180" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="3 2" />
                <text x="85" y="225" fill="#F59E0B" fontSize="10" fontFamily="monospace" textAnchor="end">
                  Hs = {suctionHead}m
                </text>

                {/* Ls Label */}
                <text x="180" y="170" fill="#94A3B8" fontSize="10" fontFamily="monospace">
                  Ls = {suctionLength}m (Ø {Math.round(suctionDiameter * 1000)}mm)
                </text>

                {/* Hd Annotation */}
                <line x1="285" y1="180" x2="285" y2={Math.max(50, 180 - deliveryHead * 3)} stroke="#10B981" strokeWidth="1.5" strokeDasharray="3 2" />
                <text x="295" y={180 - (deliveryHead * 1.5)} fill="#10B981" fontSize="10" fontFamily="monospace">
                  Hd = {deliveryHead}m
                </text>

                {/* Legend */}
                <g transform="translate(20, 20)">
                  <rect x="0" y="0" width="160" height="42" fill="#0B0F17" stroke="#1E293B" rx="6" opacity="0.9" />
                  <line x1="10" y1="14" x2="30" y2="14" stroke="#00F2FE" strokeWidth="4" />
                  <text x="36" y="17" fill="#CBD5E1" fontSize="9" fontFamily="monospace">Pipeline Flow</text>
                  <line x1="10" y1="28" x2="30" y2="28" stroke="#F59E0B" strokeWidth="2" strokeDasharray="3 2" />
                  <text x="36" y="31" fill="#CBD5E1" fontSize="9" fontFamily="monospace">Hydraulic Head Line</text>
                </g>
              </svg>
            </div>
          </div>

          {/* 2. Pump H-Q Operating Point & System Head Curve */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 backdrop-blur-md">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                  <span>📈</span> Pump Curve vs System Head Characteristic (Duty Point)
                </h3>
                <p className="text-xs text-slate-400">Intersection defines actual operating duty flow and head.</p>
              </div>
              <div className="text-xs font-mono text-slate-400 flex gap-4">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span> Pump H-Q</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> System Resistance</span>
              </div>
            </div>

            {/* Custom SVG Curve Graph */}
            <div className="w-full h-64 bg-[#070A10] rounded-xl border border-slate-800/80 p-4 relative">
              <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                {/* Axes */}
                <line x1="40" y1="10" x2="40" y2="170" stroke="#334155" strokeWidth="1.5" />
                <line x1="40" y1="170" x2="480" y2="170" stroke="#334155" strokeWidth="1.5" />

                {/* Gridlines */}
                <line x1="40" y1="120" x2="480" y2="120" stroke="#1E293B" strokeWidth="1" strokeDasharray="2 2" />
                <line x1="40" y1="70" x2="480" y2="70" stroke="#1E293B" strokeWidth="1" strokeDasharray="2 2" />
                <line x1="150" y1="10" x2="150" y2="170" stroke="#1E293B" strokeWidth="1" strokeDasharray="2 2" />
                <line x1="300" y1="10" x2="300" y2="170" stroke="#1E293B" strokeWidth="1" strokeDasharray="2 2" />

                {/* Plots */}
                {(() => {
                  const maxH = Math.max(...results.curveData.map((d) => Math.max(d.pumpHead, d.systemHead))) * 1.15;
                  const maxQ = results.curveData[results.curveData.length - 1].flow;

                  const mapX = (q) => 40 + (q / maxQ) * 430;
                  const mapY = (h) => 170 - (h / maxH) * 150;

                  const pumpPath = results.curveData.reduce(
                    (acc, pt, idx) => `${acc} ${idx === 0 ? "M" : "L"} ${mapX(pt.flow)} ${mapY(pt.pumpHead)}`,
                    ""
                  );

                  const systemPath = results.curveData.reduce(
                    (acc, pt, idx) => `${acc} ${idx === 0 ? "M" : "L"} ${mapX(pt.flow)} ${mapY(pt.systemHead)}`,
                    ""
                  );

                  const dutyX = mapX(flowRate);
                  const dutyY = mapY(results.heads.tdh);

                  return (
                    <>
                      {/* Pump HQ Curve */}
                      <path d={pumpPath} fill="none" stroke="#00F2FE" strokeWidth="2.5" />
                      {/* System Curve */}
                      <path d={systemPath} fill="none" stroke="#F59E0B" strokeWidth="2.5" />

                      {/* Operating Point Intersection Circle */}
                      <circle cx={dutyX} cy={dutyY} r="6" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
                      <line x1={dutyX} y1={dutyY} x2={dutyX} y2="170" stroke="#10B981" strokeWidth="1" strokeDasharray="3 3" />
                      <line x1="40" y1={dutyY} x2={dutyX} y2={dutyY} stroke="#10B981" strokeWidth="1" strokeDasharray="3 3" />

                      <text x={dutyX + 10} y={dutyY - 10} fill="#10B981" fontSize="10" fontWeight="bold" fontFamily="monospace">
                        Duty Point ({flowRate} m³/h, {results.heads.tdh}m)
                      </text>
                    </>
                  );
                })()}
              </svg>
              <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1 px-8">
                <span>0 m³/h</span>
                <span>Flow Rate (Q) ➔</span>
                <span>Max Flow</span>
              </div>
            </div>
          </div>

          {/* 3. AI Hydraulic Insights & Diagnostics Panel */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 backdrop-blur-md space-y-3">
            <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
              <span>🤖</span> AI Hydraulic Diagnostics & Insights
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {aiInsights.map((insight, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-lg border text-xs font-mono flex flex-col justify-between ${
                    insight.type === "danger"
                      ? "bg-rose-950/30 border-rose-500/40 text-rose-200"
                      : insight.type === "warning"
                      ? "bg-amber-950/30 border-amber-500/40 text-amber-200"
                      : insight.type === "success"
                      ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-200"
                      : "bg-cyan-950/30 border-cyan-500/40 text-cyan-200"
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5 mb-1">
                    <span>
                      {insight.type === "danger" ? "🚨" : insight.type === "warning" ? "⚠️" : insight.type === "success" ? "✅" : "💡"}
                    </span>
                    {insight.title}
                  </div>
                  <p className="opacity-80 text-[11px] leading-relaxed">{insight.message}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Gemini Advisor */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 backdrop-blur-md mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bot className="text-cyan-300" />
                <h4 className="text-sm font-bold text-white">Gemini Hydraulic Advisor</h4>
              </div>
              <div>
                <button onClick={fetchAiAnalysisPump} disabled={aiLoading} className="text-xs px-3 py-1 rounded-md bg-slate-800/60 hover:bg-slate-800/80 border border-slate-700 text-slate-200">
                  {aiLoading ? 'Analyzing...' : 'Evaluate System'}
                </button>
              </div>
            </div>
            {aiAnalysis && (
              <div className="mt-3 text-slate-300 text-sm whitespace-pre-wrap">{aiAnalysis}</div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}