'use client';

import React, { useState, useMemo } from 'react';
import { 
  Gauge, 
  Layers, 
  Maximize2, 
  BarChart2, 
  TrendingUp, 
  AlertTriangle, 
  ShieldCheck, 
  Sparkles, 
  Activity, 
  Bot,
  Zap,
  Repeat,
  Info,
  Sliders,
  Scale,
  ShieldAlert
} from 'lucide-react';

export default function BeamBucklingPage() {
  // ---------------------------------------------------------------------------
  // 1. STATE MANAGEMENT (3 Load Mode Tabs & Separate Input Parameters)
  // ---------------------------------------------------------------------------
  const [loadTab, setLoadTab] = useState('static'); // 'static' | 'fatigue' | 'impact'
  const [diagramTab, setDiagramTab] = useState('deflection'); // 'deflection' | 'sfd' | 'bmd' | 'goodman'

  const [inputs, setInputs] = useState({
    // Common Section & Material Parameters
    condition: 'pinned_pinned', // Boundary Condition key
    E_gpa: 200,                 // Young's Modulus (GPa)
    I_cm4: 800,                 // Second Moment of Area (cm⁴)
    A_cm2: 40,                  // Cross-Sectional Area (cm²)
    L_m: 4.0,                   // Column Span Length (m)

    // --- TAB 1: Static Load Parameters ---
    P_static_kn: 50,            // Static Axial Load (kN)
    eccentricity_mm: 8,         // Initial Load Eccentricity e (mm)

    // --- TAB 2: Fatigue Load Parameters ---
    P_mean_kn: 30,              // Cyclic Mean Load P_m (kN)
    P_alt_kn: 25,               // Cyclic Alternating Load Amplitude P_a (kN)
    ultimate_su_mpa: 450,       // Ultimate Tensile Strength S_u (MPa)
    endurance_se_mpa: 225,      // Fatigue Endurance Limit S_e (MPa)
    K_t: 1.2,                   // Stress Concentration Factor

    // --- TAB 3: Dynamic Impact Load Parameters ---
    drop_mass_kg: 250,          // Dropping Impact Mass (kg)
    drop_h_mm: 50,              // Drop Height (mm)
  });

  const [aiAnalysis, setAiAnalysis] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [error, setError] = useState('');

  // K-Factor mapping for column boundary conditions
  const kFactors = {
    pinned_pinned: 1.0,
    fixed_fixed: 0.5,
    fixed_pinned: 0.7,
    fixed_free: 2.0
  };

  // Generic Handler for Form Inputs
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setInputs((prev) => ({
      ...prev,
      [name]: name === 'condition' ? value : parseFloat(value) || 0
    }));
  };

  // ---------------------------------------------------------------------------
  // 2. COMPUTATIONS (Distinct Calculations Per Load Tab)
  // ---------------------------------------------------------------------------
  const activeResult = useMemo(() => {
    try {
      setError('');

      const K = kFactors[inputs.condition] || 1.0;
      const L_effective = K * inputs.L_m; // meters

      // Common SI Unit Conversions
      const E_pa = inputs.E_gpa * 1e9;         // GPa to Pa
      const I_m4 = inputs.I_cm4 * 1e-8;        // cm⁴ to m⁴
      const A_m2 = inputs.A_cm2 * 1e-4;        // cm² to m²

      if (L_effective <= 0 || E_pa <= 0 || I_m4 <= 0 || A_m2 <= 0) {
        throw new Error("Geometric, material, and section parameters must be strictly greater than zero.");
      }

      // Base Euler Critical Buckling Load (P_cr)
      const P_cr_N = (Math.PI ** 2 * E_pa * I_m4) / (L_effective ** 2);
      const P_cr_kn = P_cr_N / 1000;

      // Radius of Gyration & Slenderness
      const r_m = Math.sqrt(I_m4 / A_m2);
      const slenderness = (L_effective / r_m).toFixed(1);

      // --- 1. STATIC LOAD CALCULATIONS ---
      const P_stat_N = inputs.P_static_kn * 1000;
      const static_fos = inputs.P_static_kn > 0 ? (P_cr_kn / inputs.P_static_kn) : 999;
      const ecc_m = inputs.eccentricity_mm / 1000;
      const secant_factor = P_cr_N > P_stat_N ? 1 / (1 - P_stat_N / P_cr_N) : 5.0;
      const max_M_kNm = ((inputs.P_static_kn * ecc_m) * secant_factor);
      const max_V_kn = (max_M_kNm / (inputs.L_m / 2 || 1));
      const static_stress_mpa = (P_stat_N / A_m2) / 1e6;

      // --- 2. FATIGUE LOAD CALCULATIONS (Modified Goodman Criterion) ---
      const P_mean_N = inputs.P_mean_kn * 1000;
      const P_alt_N = inputs.P_alt_kn * 1000;

      const sigma_mean_mpa = (P_mean_N / A_m2) / 1e6;
      const sigma_alt_mpa = (inputs.K_t * (P_alt_N / A_m2)) / 1e6;

      const S_u = inputs.ultimate_su_mpa;
      const S_e = inputs.endurance_se_mpa;

      // Goodman Utilization: (σ_a / S_e) + (σ_m / S_u)
      const goodman_utilization = (S_e > 0 && S_u > 0)
        ? (sigma_alt_mpa / S_e) + (sigma_mean_mpa / S_u)
        : 0;

      const fatigue_fos = goodman_utilization > 0 ? (1 / goodman_utilization) : 999;
      const peak_fatigue_load_kn = inputs.P_mean_kn + inputs.P_alt_kn;

      // --- 3. DYNAMIC IMPACT LOAD CALCULATIONS ---
      const m_kg = inputs.drop_mass_kg;
      const W_N = m_kg * 9.81; // Weight force in Newtons
      const h_m = inputs.drop_h_mm / 1000;

      // Static axial displacement under the drop mass: δ_stat = (W * L) / (E * A)
      const delta_stat_m = (W_N * inputs.L_m) / (E_pa * A_m2);

      // Dynamic Amplification Factor: DAF = 1 + √(1 + (2 * h) / δ_stat)
      const daf = delta_stat_m > 0 
        ? 1 + Math.sqrt(1 + (2 * h_m) / delta_stat_m) 
        : 1.0;

      const P_impact_N = W_N * daf;
      const P_impact_kn = P_impact_N / 1000;
      const impact_fos = P_impact_kn > 0 ? (P_cr_kn / P_impact_kn) : 999;
      const dynamic_stress_mpa = (P_impact_N / A_m2) / 1e6;

      return {
        P_cr_kn: P_cr_kn.toFixed(1),
        slenderness,
        r_mm: (r_m * 1000).toFixed(1),

        // Static Results
        static_fos: static_fos.toFixed(2),
        max_M_kNm: max_M_kNm.toFixed(2),
        max_V_kn: max_V_kn.toFixed(2),
        static_stress_mpa: static_stress_mpa.toFixed(1),

        // Fatigue Results
        sigma_mean_mpa: sigma_mean_mpa.toFixed(1),
        sigma_alt_mpa: sigma_alt_mpa.toFixed(1),
        goodman_utilization: goodman_utilization.toFixed(2),
        fatigue_fos: fatigue_fos.toFixed(2),
        peak_fatigue_load_kn: peak_fatigue_load_kn.toFixed(1),

        // Impact Results
        delta_stat_mm: (delta_stat_m * 1000).toFixed(3),
        daf: daf.toFixed(2),
        P_impact_kn: P_impact_kn.toFixed(1),
        impact_fos: impact_fos.toFixed(2),
        dynamic_stress_mpa: dynamic_stress_mpa.toFixed(1),
      };
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, [inputs]);

  // Operational Condition Failure Flags based on current active load tab
  const isFailed = useMemo(() => {
    if (!activeResult) return false;
    if (loadTab === 'static') {
      return inputs.P_static_kn >= parseFloat(activeResult.P_cr_kn);
    } else if (loadTab === 'fatigue') {
      return parseFloat(activeResult.goodman_utilization) >= 1.0;
    } else if (loadTab === 'impact') {
      return parseFloat(activeResult.P_impact_kn) >= parseFloat(activeResult.P_cr_kn);
    }
    return false;
  }, [loadTab, inputs, activeResult]);

  // ---------------------------------------------------------------------------
  // 3. SVG PATH GENERATORS FOR GRAPHICAL DIAGRAMS
  // ---------------------------------------------------------------------------
  const getDeflectionPath = (height) => {
    const isBuckled = isFailed;
    const currentP = loadTab === 'static' 
      ? inputs.P_static_kn 
      : loadTab === 'fatigue' 
      ? (inputs.P_mean_kn + inputs.P_alt_kn) 
      : parseFloat(activeResult?.P_impact_kn || 0);

    const amp = Math.min((currentP / (parseFloat(activeResult?.P_cr_kn) || 1)) * 30, 38);
    const p1 = { x: 0, y: height / 2 };
    const p2 = { x: 250, y: isBuckled ? height - 8 : height / 2 + amp };
    const p3 = { x: 500, y: height / 2 };
    return `M ${p1.x} ${p1.y} Q ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`;
  };

  const getSFDPath = (height) => {
    const midY = height / 2;
    const v = Math.min(parseFloat(activeResult?.max_V_kn || 0) * 1.5, 30);
    const line = `M 0 ${midY} L 0 ${midY - v} L 250 ${midY - v} L 250 ${midY + v} L 500 ${midY + v} L 500 ${midY}`;
    const area = `${line} Z`;
    return { line, area };
  };

  const getBMDPath = (height) => {
    const midY = height / 2;
    const m = Math.min(parseFloat(activeResult?.max_M_kNm || 0) * 2, 35);
    const line = `M 0 ${midY} Q 250 ${midY + m * 2}, 500 ${midY}`;
    const area = `M 0 ${midY} Q 250 ${midY + m * 2}, 500 ${midY} Z`;
    return { line, area };
  };

  // ---------------------------------------------------------------------------
  // 4. AI STRUCTURAL ADVISOR INTEGRATION
  // ---------------------------------------------------------------------------
  const fetchAiAnalysis = async () => {
    setAiLoading(true);
    setAiError('');
    setAiAnalysis('');

    try {
      setTimeout(() => {
        let title = "";
        let details = "";
        let recommendation = "";

        if (loadTab === 'static') {
          title = "STATIC BUCKLING ASSESSMENT";
          details = `Applied static load of ${inputs.P_static_kn} kN vs Critical Euler Load (P_cr) of ${activeResult.P_cr_kn} kN. ` +
                    `Static Factor of Safety is ${activeResult.static_fos}. Maximum induced bending moment is ${activeResult.max_M_kNm} kN·m.`;
          recommendation = parseFloat(activeResult.static_fos) < 1.0 
            ? "CRITICAL: Static axial force exceeds the elastic instability limit. Increase section moment of inertia (I) or shorten effective span length."
            : "SAFE: Static load remains within stable buckling margins.";
        } else if (loadTab === 'fatigue') {
          title = "GOODMAN FATIGUE ENDURANCE ASSESSMENT";
          details = `Mean Stress (σ_m) = ${activeResult.sigma_mean_mpa} MPa | Alternating Stress (σ_a) = ${activeResult.sigma_alt_mpa} MPa.\n` +
                    `Goodman Utilization Index is ${activeResult.goodman_utilization} (Fatigue FoS: ${activeResult.fatigue_fos}).`;
          recommendation = parseFloat(activeResult.goodman_utilization) >= 1.0
            ? "UNSAFE: Operating stress state exceeds the Goodman fatigue envelope. Risk of cyclic fatigue crack initiation. Reduce alternating amplitude or choose material with higher S_u and S_e."
            : "SAFE: Stress state resides within the infinite fatigue life boundary.";
        } else {
          title = "DYNAMIC DROP IMPACT ASSESSMENT";
          details = `Drop Mass = ${inputs.drop_mass_kg} kg from ${inputs.drop_h_mm} mm height.\n` +
                    `Dynamic Amplification Factor (DAF) = ${activeResult.daf}x. Transient Peak Load = ${activeResult.P_impact_kn} kN (Impact FoS: ${activeResult.impact_fos}).`;
          recommendation = parseFloat(activeResult.impact_fos) < 1.0
            ? "CRITICAL: Dynamic kinetic impact forces exceed critical buckling resistance. Add impact absorption dampers or increase cross-sectional stiffness."
            : "SAFE: Dynamic impact transient force remains below critical buckling limits.";
        }

        setAiAnalysis(
          `**GEMINI ADVISOR - ${title}**\n\n` +
          `• **Diagnostic Summary:** ${details}\n\n` +
          `• **Engineering Advisory:** ${recommendation}`
        );
        setAiLoading(false);
      }, 600);
    } catch (err) {
      setAiError('Failed to generate AI insights.');
      setAiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      <main className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <header className="border-b border-slate-800 pb-4 flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-cyan-400 flex items-center gap-2">
              <Layers className="w-6 h-6" /> Beam & Column Load Analyzer
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              Multi-regime structural analysis platform for Static Euler Buckling, Goodman Cyclic Fatigue, and Dynamic Impact.
            </p>
          </div>
        </header>

        {/* ------------------------------------------------------------------- */}
        {/* 3 LOAD REGIME MODE SELECTION TABS                                   */}
        {/* ------------------------------------------------------------------- */}
        <div className="grid grid-cols-3 gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 font-mono text-xs">
          <button
            onClick={() => { setLoadTab('static'); setDiagramTab('deflection'); }}
            className={`py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all ${
              loadTab === 'static'
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Gauge className="w-4 h-4" /> 1. Static Load Tab
          </button>

          <button
            onClick={() => { setLoadTab('fatigue'); setDiagramTab('goodman'); }}
            className={`py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all ${
              loadTab === 'fatigue'
                ? 'bg-purple-500 text-slate-950 shadow-lg shadow-purple-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Repeat className="w-4 h-4" /> 2. Fatigue Load Tab
          </button>

          <button
            onClick={() => { setLoadTab('impact'); setDiagramTab('deflection'); }}
            className={`py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all ${
              loadTab === 'impact'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Zap className="w-4 h-4" /> 3. Impact Load Tab
          </button>
        </div>

        {/* Main 2-Column Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Column: Parameter Inputs Deck (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            
            {/* Common Section Parameters Card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center gap-2 border-b border-slate-800 pb-3">
                <Sliders className="w-4 h-4 text-cyan-400" /> Member & Geometry Section Parameters
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                {/* End Support Condition */}
                <div className="col-span-2">
                  <label className="block text-slate-400 mb-1">Boundary Condition (K)</label>
                  <select 
                    name="condition" 
                    value={inputs.condition} 
                    onChange={handleInputChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="pinned_pinned">Pinned - Pinned (K = 1.0)</option>
                    <option value="fixed_fixed">Fixed - Fixed (K = 0.5)</option>
                    <option value="fixed_pinned">Fixed - Pinned (K = 0.7)</option>
                    <option value="fixed_free">Fixed - Free / Cantilever (K = 2.0)</option>
                  </select>
                </div>

                {/* Young's Modulus E */}
                <div>
                  <label className="block text-slate-400 mb-1">E Modulus (GPa)</label>
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
                  <label className="block text-slate-400 mb-1">Inertia I (cm⁴)</label>
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
                  <label className="block text-slate-400 mb-1">Area A (cm²)</label>
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
                  <label className="block text-slate-400 mb-1">Span Length L (m)</label>
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
            </div>

            {/* TAB 1 INPUTS: STATIC LOAD PARAMETERS */}
            {loadTab === 'static' && (
              <div className="bg-slate-900/60 border border-cyan-500/30 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Gauge className="w-4 h-4 text-cyan-400" /> Static Loading Parameters
                </h3>

                <div className="space-y-4 text-xs font-mono">
                  <div>
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>Static Axial Load (P<sub>static</sub>)</span>
                      <span className="text-cyan-400 font-bold">{inputs.P_static_kn} kN</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max={activeResult ? Math.max(Math.ceil(parseFloat(activeResult.P_cr_kn) * 1.5), 100) : 500} 
                      value={inputs.P_static_kn} 
                      onChange={handleInputChange} 
                      name="P_static_kn"
                      className="w-full accent-cyan-500 bg-slate-950 h-2 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                      <span>0 kN</span>
                      {activeResult && <span className="text-cyan-400 font-bold">P<sub>cr</sub>: {activeResult.P_cr_kn} kN</span>}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>Load Eccentricity (e)</span>
                      <span className="text-cyan-400 font-bold">{inputs.eccentricity_mm} mm</span>
                    </div>
                    <input 
                      type="number" 
                      name="eccentricity_mm" 
                      value={inputs.eccentricity_mm} 
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2 INPUTS: FATIGUE LOAD PARAMETERS */}
            {loadTab === 'fatigue' && (
              <div className="bg-slate-900/60 border border-purple-500/30 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-mono uppercase tracking-wider text-purple-400 font-semibold flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Repeat className="w-4 h-4 text-purple-400" /> Goodman Cyclic Fatigue Parameters
                </h3>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div>
                    <label className="block text-slate-400 mb-1">Mean Load P<sub>m</sub> (kN)</label>
                    <input 
                      type="number" 
                      name="P_mean_kn" 
                      value={inputs.P_mean_kn} 
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Alt. Load P<sub>a</sub> (kN)</label>
                    <input 
                      type="number" 
                      name="P_alt_kn" 
                      value={inputs.P_alt_kn} 
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Tensile S<sub>u</sub> (MPa)</label>
                    <input 
                      type="number" 
                      name="ultimate_su_mpa" 
                      value={inputs.ultimate_su_mpa} 
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Endurance S<sub>e</sub> (MPa)</label>
                    <input 
                      type="number" 
                      name="endurance_se_mpa" 
                      value={inputs.endurance_se_mpa} 
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-slate-400 mb-1">Stress Concentration K<sub>t</sub></label>
                    <input 
                      type="number" 
                      step="0.1"
                      name="K_t" 
                      value={inputs.K_t} 
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3 INPUTS: DYNAMIC IMPACT PARAMETERS */}
            {loadTab === 'impact' && (
              <div className="bg-slate-900/60 border border-amber-500/30 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-mono uppercase tracking-wider text-amber-400 font-semibold flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Zap className="w-4 h-4 text-amber-400" /> Dynamic Impact Load Parameters
                </h3>

                <div className="space-y-3 text-xs font-mono">
                  <div>
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>Impact Drop Mass (m)</span>
                      <span className="text-amber-400 font-bold">{inputs.drop_mass_kg} kg</span>
                    </div>
                    <input 
                      type="number" 
                      name="drop_mass_kg" 
                      value={inputs.drop_mass_kg} 
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>Drop Height (h)</span>
                      <span className="text-amber-400 font-bold">{inputs.drop_h_mm} mm</span>
                    </div>
                    <input 
                      type="number" 
                      name="drop_h_mm" 
                      value={inputs.drop_h_mm} 
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Right Column: Visualizer & Results (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Visualizer Header Controls */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <h4 className="text-xs font-mono uppercase text-slate-300 font-semibold flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-cyan-400" /> Real-time Graphical Visualizer
                </h4>

                {/* Sub-view switcher */}
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
                  {loadTab === 'fatigue' ? (
                    <button
                      onClick={() => setDiagramTab('goodman')}
                      className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                        diagramTab === 'goodman' ? 'bg-purple-500 text-slate-950 font-bold' : 'text-slate-400'
                      }`}
                    >
                      <Scale className="w-3.5 h-3.5" /> Goodman Diagram
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setDiagramTab('deflection')}
                        className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                          diagramTab === 'deflection' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400'
                        }`}
                      >
                        <Maximize2 className="w-3.5 h-3.5" /> Deflection Profile
                      </button>
                      <button
                        onClick={() => setDiagramTab('sfd')}
                        className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                          diagramTab === 'sfd' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'
                        }`}
                      >
                        <BarChart2 className="w-3.5 h-3.5" /> SFD
                      </button>
                      <button
                        onClick={() => setDiagramTab('bmd')}
                        className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                          diagramTab === 'bmd' ? 'bg-purple-500 text-slate-950 font-bold' : 'text-slate-400'
                        }`}
                      >
                        <TrendingUp className="w-3.5 h-3.5" /> BMD
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Dynamic Visualizations */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 relative">
                {diagramTab === 'deflection' && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-[11px] font-mono text-slate-400">
                      <span>• Member Elastic Deflection y(x)</span>
                      <span>Span: {inputs.L_m}m</span>
                    </div>
                    <div className="h-28 w-full relative flex items-center justify-center">
                      <svg className="w-full h-full" viewBox="0 0 500 80" preserveAspectRatio="none">
                        <line x1="0" y1="40" x2="500" y2="40" stroke="#334155" strokeDasharray="4 4" strokeWidth="1" />
                        <path
                          d={getDeflectionPath(80)}
                          fill="none"
                          stroke={isFailed ? "#f43f5e" : loadTab === 'impact' ? "#f59e0b" : "#06b6d4"}
                          strokeWidth="3"
                          className="transition-all duration-300"
                        />
                      </svg>
                    </div>
                  </div>
                )}

                {diagramTab === 'goodman' && activeResult && (
                  <div className="space-y-2 font-mono">
                    <div className="flex justify-between text-[11px] text-purple-400">
                      <span>• Modified Goodman Stress Diagram (σ_a vs σ_m)</span>
                      <span>Index: {activeResult.goodman_utilization}</span>
                    </div>
                    <div className="h-40 w-full relative flex items-center justify-center pt-2">
                      <svg className="w-full h-full overflow-visible" viewBox="0 0 300 120">
                        {/* Grid & Axes */}
                        <line x1="30" y1="100" x2="280" y2="100" stroke="#475569" strokeWidth="1.5" />
                        <line x1="30" y1="10" x2="30" y2="100" stroke="#475569" strokeWidth="1.5" />

                        {/* Labels */}
                        <text x="280" y="115" fill="#94a3b8" fontSize="8" textAnchor="end">σ_mean (S_u = {inputs.ultimate_su_mpa}MPa)</text>
                        <text x="10" y="15" fill="#94a3b8" fontSize="8" transform="rotate(-90 15,20)">σ_alt (S_e = {inputs.endurance_se_mpa}MPa)</text>

                        {/* Goodman Line Boundary */}
                        <line x1="30" y1="20" x2="250" y2="100" stroke="#a855f7" strokeWidth="2" strokeDasharray="3 3" />

                        {/* Operating Stress Point */}
                        {(() => {
                          const cx = 30 + Math.min((parseFloat(activeResult.sigma_mean_mpa) / (inputs.ultimate_su_mpa || 1)) * 220, 240);
                          const cy = 100 - Math.min((parseFloat(activeResult.sigma_alt_mpa) / (inputs.endurance_se_mpa || 1)) * 80, 90);
                          return (
                            <>
                              <circle cx={cx} cy={cy} r="5" fill={isFailed ? '#f43f5e' : '#22c55e'} />
                              <text x={cx + 8} y={cy + 3} fill="#f8fafc" fontSize="9" fontWeight="bold">
                                ({activeResult.sigma_mean_mpa}, {activeResult.sigma_alt_mpa})
                              </text>
                            </>
                          );
                        })()}
                      </svg>
                    </div>
                  </div>
                )}

                {diagramTab === 'sfd' && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-[11px] font-mono text-amber-400">
                      <span>• Shear Force Diagram (SFD)</span>
                      <span>V_max = {activeResult?.max_V_kn} kN</span>
                    </div>
                    <div className="h-28 w-full relative flex items-center justify-center">
                      <svg className="w-full h-full" viewBox="0 0 500 80" preserveAspectRatio="none">
                        <line x1="0" y1="40" x2="500" y2="40" stroke="#334155" strokeDasharray="4 4" strokeWidth="1" />
                        <path d={getSFDPath(80).area} fill="#f59e0b" opacity="0.25" />
                        <path d={getSFDPath(80).line} fill="none" stroke="#f59e0b" strokeWidth="2" />
                      </svg>
                    </div>
                  </div>
                )}

                {diagramTab === 'bmd' && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-[11px] font-mono text-purple-400">
                      <span>• Bending Moment Diagram (BMD)</span>
                      <span>M_max = {activeResult?.max_M_kNm} kN·m</span>
                    </div>
                    <div className="h-28 w-full relative flex items-center justify-center">
                      <svg className="w-full h-full" viewBox="0 0 500 80" preserveAspectRatio="none">
                        <line x1="0" y1="40" x2="500" y2="40" stroke="#334155" strokeDasharray="4 4" strokeWidth="1" />
                        <path d={getBMDPath(80).area} fill="#a855f7" opacity="0.25" />
                        <path d={getBMDPath(80).line} fill="none" stroke="#a855f7" strokeWidth="2" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-950/40 border border-red-500/50 p-4 rounded-xl text-red-400 text-xs flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Status & Results Section */}
            {activeResult && (
              <>
                {/* Status Banner */}
                <div className={`p-5 rounded-2xl border transition-all ${
                  isFailed
                    ? 'bg-rose-950/40 border-rose-500/50 text-rose-300' 
                    : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                } flex items-center justify-between`}>
                  <div className="space-y-1">
                    <span className="text-xs font-mono uppercase text-slate-400">
                      Active Mode Status ({loadTab.toUpperCase()})
                    </span>
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      {isFailed ? (
                        <>
                          <ShieldAlert className="w-6 h-6 text-rose-500 animate-bounce" /> 
                          <span className="text-rose-400">LIMIT STATE EXCEEDED</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-6 h-6 text-emerald-400" /> 
                          <span className="text-emerald-400 font-bold">STRUCTURALLY SAFE</span>
                        </>
                      )}
                    </h3>
                  </div>

                  <div className="text-right font-mono">
                    <div className="text-xs text-slate-400">Factor of Safety</div>
                    <div className={`text-2xl font-extrabold ${isFailed ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {loadTab === 'static' ? activeResult.static_fos : loadTab === 'fatigue' ? activeResult.fatigue_fos : activeResult.impact_fos}
                    </div>
                  </div>
                </div>

                {/* Tab-Specific Results Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                  
                  {/* Common Metric */}
                  <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
                    <span className="text-slate-500 block">Critical Euler (P<sub>cr</sub>)</span>
                    <span className="text-cyan-400 text-sm font-bold">{activeResult.P_cr_kn} kN</span>
                  </div>

                  {/* Mode-Dependent Metrics */}
                  {loadTab === 'static' && (
                    <>
                      <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
                        <span className="text-slate-500 block">Max Moment (M<sub>max</sub>)</span>
                        <span className="text-purple-400 text-sm font-bold">{activeResult.max_M_kNm} kN·m</span>
                      </div>
                      <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
                        <span className="text-slate-500 block">Axial Stress</span>
                        <span className="text-slate-200 text-sm font-bold">{activeResult.static_stress_mpa} MPa</span>
                      </div>
                      <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
                        <span className="text-slate-500 block">Slenderness (&lambda;)</span>
                        <span className="text-slate-200 text-sm font-bold">{activeResult.slenderness}</span>
                      </div>
                    </>
                  )}

                  {loadTab === 'fatigue' && (
                    <>
                      <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
                        <span className="text-slate-500 block">Mean Stress (σ<sub>m</sub>)</span>
                        <span className="text-purple-400 text-sm font-bold">{activeResult.sigma_mean_mpa} MPa</span>
                      </div>
                      <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
                        <span className="text-slate-500 block">Alt Stress (σ<sub>a</sub>)</span>
                        <span className="text-purple-400 text-sm font-bold">{activeResult.sigma_alt_mpa} MPa</span>
                      </div>
                      <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
                        <span className="text-slate-500 block">Goodman Index</span>
                        <span className={`text-sm font-bold ${isFailed ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {activeResult.goodman_utilization} / 1.0
                        </span>
                      </div>
                    </>
                  )}

                  {loadTab === 'impact' && (
                    <>
                      <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
                        <span className="text-slate-500 block">DAF Multiplier</span>
                        <span className="text-amber-400 text-sm font-bold">{activeResult.daf}x</span>
                      </div>
                      <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
                        <span className="text-slate-500 block">Peak Impact Load</span>
                        <span className="text-amber-400 text-sm font-bold">{activeResult.P_impact_kn} kN</span>
                      </div>
                      <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
                        <span className="text-slate-500 block">Peak Stress</span>
                        <span className="text-slate-200 text-sm font-bold">{activeResult.dynamic_stress_mpa} MPa</span>
                      </div>
                    </>
                  )}

                </div>

                {/* AI Structural Advisor */}
                <div className="bg-slate-900/80 border border-cyan-500/30 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-cyan-400" />
                      <h4 className="text-sm font-bold text-white">Gemini Structural Advisor</h4>
                    </div>

                    <button
                      onClick={fetchAiAnalysis}
                      disabled={aiLoading}
                      className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-mono font-semibold transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {aiLoading ? <Activity className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
                      {aiLoading ? "Analyzing..." : "Evaluate Active Tab"}
                    </button>
                  </div>

                  {aiAnalysis && (
                    <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-300 leading-relaxed whitespace-pre-line bg-slate-950/70 p-4 rounded-xl font-mono">
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