'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import * as THREE from 'three';
import { useRouter } from 'next/navigation'; // Assuming Next.js App Router
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
  Sliders,
  Scale,
  ShieldAlert,
  Cpu,
  Compass,
  PlusCircle,
  ExternalLink
} from 'lucide-react';
import ToolInstructions from '@/app/components/ToolInstructions';

const BeamShaderMaterial = {
  uniforms: {
    uLoad: { value: 1000.0 },
    uLength: { value: 2.0 },
    uWidth: { value: 0.1 },
    uHeight: { value: 0.2 },
    uE: { value: 200e9 },
    uMaxStress: { value: 1e6 },
    uYield: { value: 250e6 },
    uCriticalLoad: { value: 100000.0 },
    uScaleFactor: { value: 1.0 },
    uVisualScale: { value: 0.1 },
  },
  vertexShader: `
    uniform float uLoad;
    uniform float uLength;
    uniform float uWidth;
    uniform float uHeight;
    uniform float uE;
    uniform float uMaxStress;
    uniform float uCriticalLoad;
    uniform float uScaleFactor;
    uniform float uVisualScale;

    varying float vStressRatio;
    varying float vXPos;
    varying vec3 vNormal;

    void main() {
      vNormal = normal;
      vec3 pos = position;
      float x = pos.y + (uLength * 0.5);
      vXPos = x;

      float I = (uWidth * pow(uHeight, 3.0)) / 12.0;
      float deflection = 0.0;
      if (I > 0.0 && uE > 0.0 && x >= 0.0) {
        deflection = (uLoad * x * x * (3.0 * uLength - x)) / (6.0 * uE * I);
      }

      pos.x += deflection * uScaleFactor * uVisualScale;
      float c = max(uWidth, uHeight) * 0.5;
      float bendingMoment = uLoad * x;
      float localStress = (bendingMoment * c) / max(I, 0.00001);
      vStressRatio = uMaxStress > 0.0 ? clamp(localStress / uMaxStress, 0.0, 1.0) : 0.0;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    varying float vStressRatio;
    varying float vXPos;
    varying vec3 vNormal;
    uniform float uLength;

    vec3 getHeatmapColor(float val) {
      val = clamp(val, 0.0, 1.0);
      float r = clamp(min(4.0 * val - 1.5, -4.0 * val + 4.5), 0.0, 1.0);
      float g = clamp(min(4.0 * val - 0.5, -4.0 * val + 3.5), 0.0, 1.0);
      float b = clamp(min(4.0 * val + 0.5, -4.0 * val + 2.5), 0.0, 1.0);
      return vec3(r, g, b);
    }

    void main() {
      vec3 baseColor = getHeatmapColor(vStressRatio);
      float rootDist = vXPos / uLength;
      if (rootDist < 0.04) {
        float glow = (1.0 - rootDist / 0.04);
        baseColor = mix(baseColor, vec3(1.0, 0.05, 0.1), glow * 0.7);
      }
      vec3 lightDir = normalize(vec3(1.0, 1.0, 2.0));
      float diff = max(dot(vNormal, lightDir), 0.3);
      gl_FragColor = vec4(baseColor * diff, 1.0);
    }
  `,
};

function BeamScene({ loadP, lengthL, widthB, heightH, youngE, yieldStrength, maxStress, criticalLoad, visualScale }) {
  const meshRef = useRef();
  const materialRef = useRef();

  const geometry = useMemo(
    () => new THREE.BoxGeometry(widthB, lengthL, heightH, 32, 120, 32),
    [lengthL, heightH, widthB]
  );

  const uniforms = useMemo(
    () => ({
      uLoad: { value: loadP },
      uLength: { value: lengthL },
      uWidth: { value: widthB },
      uHeight: { value: heightH },
      uE: { value: youngE },
      uMaxStress: { value: maxStress },
      uCriticalLoad: { value: criticalLoad },
      uScaleFactor: { value: 1.0 },
      uVisualScale: { value: visualScale },
    }),
    [loadP, lengthL, widthB, heightH, youngE, maxStress, criticalLoad, visualScale]
  );

  const shaderOptions = useMemo(
    () => ({ ...BeamShaderMaterial, uniforms }),
    [uniforms]
  );

  return (
    <group position={[0, lengthL / 2, 0]}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[widthB * 2.5, 0.08, heightH * 2.5]} />
        <meshStandardMaterial color="#334155" roughness={0.3} />
      </mesh>

      <mesh ref={meshRef} geometry={geometry}>
        <shaderMaterial ref={materialRef} args={[shaderOptions]} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

const DynamicCanvasWrapper = dynamic(
  async () => {
    const { Canvas } = await import('@react-three/fiber');
    const { OrbitControls, Grid } = await import('@react-three/drei');

    return function ThreeCanvas(props) {
      return (
        <Canvas camera={{ position: [3.5, 1.8, 4.2], fov: 45 }}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[10, 10, 10]} intensity={1.2} />
          <BeamScene {...props} />
          <Grid
            args={[20, 20]}
            cellSize={0.5}
            cellThickness={1}
            cellColor="#475569"
            sectionSize={2}
            sectionThickness={1.5}
            sectionColor="#94a3b8"
            fadeDistance={25}
            infiniteGrid
          />
          <OrbitControls makeDefault minDistance={0.5} maxDistance={15} />
        </Canvas>
      );
    };
  },
  { ssr: false }
);

export default function BeamBucklingPage() {
  const router = useRouter();

  // ---------------------------------------------------------------------------
  // 1. STATE MANAGEMENT & PRESETS
  // ---------------------------------------------------------------------------
  const [loadTab, setLoadTab] = useState('static'); // 'static' | 'fatigue' | 'impact'

  const [selectedMaterial, setSelectedMaterial] = useState('steel_a36');
  const [selectedShape, setSelectedShape] = useState('ibeam_w10x33');

  // Standard Presets (These can be merged with User-Saved Items fetched from Database)
  const materialPresets = {
    steel_a36: { name: 'A36 Structural Steel', E_gpa: 200, S_y: 250, S_u: 400, S_e: 200 },
    steel_s355: { name: 'S355 High Yield Steel', E_gpa: 210, S_y: 355, S_u: 510, S_e: 255 },
    alum_6061: { name: 'Aluminum 6061-T6', E_gpa: 68.9, S_y: 276, S_u: 310, S_e: 96 },
    titanium_gr5: { name: 'Titanium Grade 5 (Ti-6Al-4V)', E_gpa: 114, S_y: 880, S_u: 950, S_e: 510 }
  };

  const shapePresets = {
    ibeam_w10x33: { name: 'I-Beam (W10x33 Profile)', I_cm4: 7110, A_cm2: 62.6, depth_mm: 247 },
    rhs_150x100: { name: 'RHS (150x100x6mm Box)', I_cm4: 1020, A_cm2: 28.1, depth_mm: 150 },
    pipe_114: { name: 'CHS Pipe (114.3x6mm Circular)', I_cm4: 228, A_cm2: 20.4, depth_mm: 114.3 },
    solid_rect: { name: 'Solid Rectangular Bar (100x50mm)', I_cm4: 1041, A_cm2: 50.0, depth_mm: 100 }
  };

  const [inputs, setInputs] = useState({
    // Common Geometry Parameters
    condition: 'pinned_pinned', // Boundary Condition key
    L_m: 4.0,                   // Column Span Length (m)

    // --- Static Load Parameters ---
    P_static_kn: 60,            // Static Axial Load (kN)
    eccentricity_mm: 10,        // Load Eccentricity e (mm)

    // --- Fatigue Load Parameters ---
    P_mean_kn: 35,              // Cyclic Mean Load P_m (kN)
    P_alt_kn: 20,               // Cyclic Alternating Load Amplitude P_a (kN)
    K_t: 1.3,                   // Stress Concentration Factor

    // --- Dynamic Impact Load Parameters ---
    drop_mass_kg: 300,          // Dropping Impact Mass (kg)
    drop_h_mm: 40,              // Drop Height (mm)
  });

  const [aiAnalysis, setAiAnalysis] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');

  // K-Factor mapping for column boundary conditions
  const kFactors = useMemo(() => ({
    pinned_pinned: 1.0,
    fixed_fixed: 0.5,
    fixed_pinned: 0.7,
    fixed_free: 2.0,
  }), []);

  // Get current active material & shape specs
  const activeMaterial = materialPresets[selectedMaterial] || materialPresets.steel_a36;
  const activeShape = shapePresets[selectedShape] || shapePresets.ibeam_w10x33;

  // Generic Handler for Load Inputs
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setInputs((prev) => ({
      ...prev,
      [name]: name === 'condition' ? value : parseFloat(value) || 0
    }));
  };

  // ---------------------------------------------------------------------------
  // 2. MATHEMATICAL & STRUCTURAL COMPUTATIONS
  // ---------------------------------------------------------------------------
  const computedBuckling = useMemo(() => {
    try {
      const K = kFactors[inputs.condition] || 1.0;
      const L_effective = K * inputs.L_m; // meters

      // SI Unit Conversions from Active Presets
      const E_pa = activeMaterial.E_gpa * 1e9;         // GPa to Pa
      const S_y_pa = activeMaterial.S_y * 1e6;        // MPa to Pa
      const I_m4 = activeShape.I_cm4 * 1e-8;          // cm⁴ to m⁴
      const A_m2 = activeShape.A_cm2 * 1e-4;          // cm² to m²
      const d_m = activeShape.depth_mm / 1000;        // mm to meters
      const ecc_m = inputs.eccentricity_mm / 1000;

      if (L_effective <= 0 || E_pa <= 0 || I_m4 <= 0 || A_m2 <= 0 || d_m <= 0) {
        throw new Error("Geometric, material, and section parameters must be strictly greater than zero.");
      }

      // Section Modulus Z = I / (d/2) in m³
      const Z_m3 = I_m4 / (d_m / 2);

      // Radius of Gyration & Slenderness
      const r_m = Math.sqrt(I_m4 / A_m2);
      const slenderness = L_effective / r_m;

      // Critical Slenderness Transition λ_c = π * √(2 * E / S_y)
      const slenderness_critical = Math.PI * Math.sqrt((2 * E_pa) / S_y_pa);

      // Euler Critical Elastic Buckling Load (P_cr)
      const P_cr_euler_N = (Math.PI ** 2 * E_pa * I_m4) / (L_effective ** 2);
      const P_cr_euler_kn = P_cr_euler_N / 1000;

      // Johnson Parabolic Buckling Load
      let P_cr_governing_N = P_cr_euler_N;
      let columnRegime = 'Long Column (Euler Buckling Governed)';

      if (slenderness < slenderness_critical) {
        columnRegime = 'Intermediate/Short Column (Johnson Yielding Governed)';
        const sigma_cr_johnson = S_y_pa * (1 - (S_y_pa * (slenderness ** 2)) / (4 * (Math.PI ** 2) * E_pa));
        P_cr_governing_N = sigma_cr_johnson * A_m2;
      }

      const P_cr_kn = P_cr_governing_N / 1000;

      // --- 1. STATIC LOAD ANALYSIS ---
      const P_stat_N = inputs.P_static_kn * 1000;
      const static_fos = inputs.P_static_kn > 0 ? (P_cr_kn / inputs.P_static_kn) : 999;
      
      const secant_static = P_cr_governing_N > P_stat_N ? 1 / (1 - P_stat_N / P_cr_governing_N) : 5.0;
      const max_M_static_kNm = (inputs.P_static_kn * ecc_m) * secant_static;
      const max_V_static_kn = max_M_static_kNm / (inputs.L_m / 2 || 1);

      const static_axial_stress_mpa = (P_stat_N / A_m2) / 1e6;
      const static_bending_stress_mpa = ((max_M_static_kNm * 1000) / Z_m3) / 1e6;
      const static_combined_stress_mpa = static_axial_stress_mpa + static_bending_stress_mpa;

      // --- 2. FATIGUE LOAD ANALYSIS ---
      const P_mean_N = inputs.P_mean_kn * 1000;
      const P_alt_N = inputs.P_alt_kn * 1000;
      const P_peak_fatigue_N = P_mean_N + P_alt_N;

      const secant_fatigue = P_cr_governing_N > P_peak_fatigue_N ? 1 / (1 - P_peak_fatigue_N / P_cr_governing_N) : 5.0;
      const max_M_fatigue_kNm = ((P_peak_fatigue_N / 1000) * ecc_m) * secant_fatigue;
      const max_V_fatigue_kn = max_M_fatigue_kNm / (inputs.L_m / 2 || 1);

      const sigma_mean_axial = (P_mean_N / A_m2) / 1e6;
      const sigma_mean_bending = (((P_mean_N / 1000) * ecc_m * secant_fatigue) * 1000 / Z_m3) / 1e6;
      const sigma_mean_total_mpa = sigma_mean_axial + sigma_mean_bending;

      const sigma_alt_axial = (P_alt_N / A_m2) / 1e6;
      const sigma_alt_bending = (((P_alt_N / 1000) * ecc_m * secant_fatigue) * 1000 / Z_m3) / 1e6;
      const sigma_alt_total_mpa = inputs.K_t * (sigma_alt_axial + sigma_alt_bending);

      const S_u = activeMaterial.S_u;
      const S_e = activeMaterial.S_e;

      const goodman_utilization = (S_e > 0 && S_u > 0)
        ? (sigma_alt_total_mpa / S_e) + (sigma_mean_total_mpa / S_u)
        : 0;

      const fatigue_fos = goodman_utilization > 0 ? (1 / goodman_utilization) : 999;

      // --- 3. DYNAMIC IMPACT LOAD ANALYSIS ---
      const m_kg = inputs.drop_mass_kg;
      const W_N = m_kg * 9.81;
      const h_m = inputs.drop_h_mm / 1000;

      const delta_stat_m = (W_N * inputs.L_m) / (E_pa * A_m2);
      const daf = delta_stat_m > 0 ? 1 + Math.sqrt(1 + (2 * h_m) / delta_stat_m) : 1.0;

      const P_impact_N = W_N * daf;
      const P_impact_kn = P_impact_N / 1000;
      const impact_fos = P_impact_kn > 0 ? (P_cr_kn / P_impact_kn) : 999;

      const secant_impact = P_cr_governing_N > P_impact_N ? 1 / (1 - P_impact_N / P_cr_governing_N) : 5.0;
      const max_M_impact_kNm = (P_impact_kn * ecc_m) * secant_impact;
      const max_V_impact_kn = max_M_impact_kNm / (inputs.L_m / 2 || 1);

      const impact_axial_stress_mpa = (P_impact_N / A_m2) / 1e6;
      const impact_bending_stress_mpa = ((max_M_impact_kNm * 1000) / Z_m3) / 1e6;
      const impact_combined_stress_mpa = impact_axial_stress_mpa + impact_bending_stress_mpa;

      return {
        result: {
          P_cr_kn: P_cr_kn.toFixed(1),
          slenderness: slenderness.toFixed(1),
          slenderness_critical: slenderness_critical.toFixed(1),
          columnRegime,
          r_mm: (r_m * 1000).toFixed(1),
          Z_cm3: (Z_m3 * 1e6).toFixed(1),

          static_fos: static_fos.toFixed(2),
          max_M_static_kNm: max_M_static_kNm.toFixed(2),
          max_V_static_kn: max_V_static_kn.toFixed(2),
          static_combined_stress_mpa: static_combined_stress_mpa.toFixed(1),

          sigma_mean_mpa: sigma_mean_total_mpa.toFixed(1),
          sigma_alt_mpa: sigma_alt_total_mpa.toFixed(1),
          goodman_utilization: goodman_utilization.toFixed(2),
          fatigue_fos: fatigue_fos.toFixed(2),
          max_M_fatigue_kNm: max_M_fatigue_kNm.toFixed(2),
          max_V_fatigue_kn: max_V_fatigue_kn.toFixed(2),

          delta_stat_mm: (delta_stat_m * 1000).toFixed(3),
          daf: daf.toFixed(2),
          P_impact_kn: P_impact_kn.toFixed(1),
          impact_fos: impact_fos.toFixed(2),
          max_M_impact_kNm: max_M_impact_kNm.toFixed(2),
          max_V_impact_kn: max_V_impact_kn.toFixed(2),
          impact_combined_stress_mpa: impact_combined_stress_mpa.toFixed(1),
        },
        error: '',
      };
    } catch (err) {
      return {
        result: null,
        error: err?.message || 'Unable to compute buckling results.',
      };
    }
  }, [inputs, activeMaterial, activeShape, kFactors]);

  const activeResult = computedBuckling.result;
  const activeResultError = computedBuckling.error;
  const displayedError = error || activeResultError;

  // Operational Condition Failure Flag
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

  // Active Mode Shear and Bending Values
  const activeMomentsAndShears = useMemo(() => {
    if (!activeResult) return { M_max: '0', V_max: '0' };
    if (loadTab === 'static') {
      return { M_max: activeResult.max_M_static_kNm, V_max: activeResult.max_V_static_kn };
    } else if (loadTab === 'fatigue') {
      return { M_max: activeResult.max_M_fatigue_kNm, V_max: activeResult.max_V_fatigue_kn };
    } else {
      return { M_max: activeResult.max_M_impact_kNm, V_max: activeResult.max_V_impact_kn };
    }
  }, [loadTab, activeResult]);

  const beamRenderParams = useMemo(() => {
    const currentLoadKn =
      loadTab === 'static'
        ? inputs.P_static_kn
        : loadTab === 'fatigue'
        ? inputs.P_mean_kn + inputs.P_alt_kn
        : parseFloat(activeResult?.P_impact_kn || 0);

    const shapeDepth = activeShape.depth_mm / 1000;
    const widthB = Math.max(shapeDepth * 0.8, 0.05);
    const heightH = Math.max(shapeDepth * 0.45, 0.04);

    const stressMpa = activeResult
      ? loadTab === 'static'
        ? parseFloat(activeResult.static_combined_stress_mpa)
        : loadTab === 'fatigue'
        ? parseFloat(activeResult.sigma_mean_mpa) + parseFloat(activeResult.sigma_alt_mpa)
        : parseFloat(activeResult.impact_combined_stress_mpa) || 0
      : 1;

    const criticalLoad = parseFloat(activeResult?.P_cr_kn || 0) * 1000;
    const loadRatio = criticalLoad > 0 ? Math.min((currentLoadKn * 1000) / criticalLoad, 2.0) : 0;
    const visualScale = loadRatio <= 1.0 ? 0.08 + loadRatio * 0.18 : 0.35 + (loadRatio - 1.0) * 1.3;

    return {
      loadP: currentLoadKn * 1000,
      lengthL: inputs.L_m,
      widthB,
      heightH,
      youngE: activeMaterial.E_gpa * 1e9,
      yieldStrength: activeMaterial.S_y * 1e6,
      maxStress: Math.max(stressMpa * 1e6, 1e5),
      criticalLoad,
      visualScale,
    };
  }, [loadTab, inputs, activeMaterial, activeShape, activeResult]);

  // ---------------------------------------------------------------------------
  // 3. SVG DIAGRAM PATH GENERATORS
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
    const v = Math.min(parseFloat(activeMomentsAndShears.V_max || 0) * 2, 30);
    const line = `M 0 ${midY} L 0 ${midY - v} L 250 ${midY - v} L 250 ${midY + v} L 500 ${midY + v} L 500 ${midY}`;
    const area = `${line} Z`;
    return { line, area };
  };

  const getBMDPath = (height) => {
    const midY = height / 2;
    const m = Math.min(parseFloat(activeMomentsAndShears.M_max || 0) * 2.2, 32);
    const line = `M 0 ${midY} Q 250 ${midY + m * 2}, 500 ${midY}`;
    const area = `M 0 ${midY} Q 250 ${midY + m * 2}, 500 ${midY} Z`;
    return { line, area };
  };

  const generateFallbackAiAnalysis = (errorMessage) => {
    let modeDetails = "";
    let recs = "";

    if (loadTab === 'static') {
      modeDetails = `Static Load P = ${inputs.P_static_kn} kN | Critical Buckling Threshold = ${activeResult.P_cr_kn} kN (Static FoS: ${activeResult.static_fos}). ` +
                    `Maximum Bending Moment M_max = ${activeResult.max_M_static_kNm} kN·m | Shear V_max = ${activeResult.max_V_static_kn} kN.`;
      recs = parseFloat(activeResult.static_fos) < 1.0
        ? "CRITICAL STATIC FAILURE: Exceeds buckling load limit. Recommend choosing a stiffer profile from /myshapes or increasing inertia I."
        : "SAFE STATIC STATE: Operating within elastic stability limits.";
    } else if (loadTab === 'fatigue') {
      modeDetails = `Fatigue Mean Stress = ${activeResult.sigma_mean_mpa} MPa | Alternating Stress = ${activeResult.sigma_alt_mpa} MPa. ` +
                    `Goodman Utilization = ${activeResult.goodman_utilization} / 1.0 (Fatigue FoS: ${activeResult.fatigue_fos}).`;
      recs = parseFloat(activeResult.goodman_utilization) >= 1.0
        ? "CRITICAL FATIGUE FAILURE: High cyclic amplitude risks fatigue failure. Select a material with higher Endurance Limit Se from /mymaterials."
        : "SAFE FATIGUE STATE: Within the infinite fatigue life Goodman boundary.";
    } else {
      modeDetails = `Impact Mass = ${inputs.drop_mass_kg} kg dropped from ${inputs.drop_h_mm} mm height. ` +
                    `DAF = ${activeResult.daf}x spiking force to ${activeResult.P_impact_kn} kN (Impact FoS: ${activeResult.impact_fos}).`;
      recs = parseFloat(activeResult.impact_fos) < 1.0
        ? "CRITICAL DYNAMIC FAILURE: Dynamic shock causes instantaneous buckling. Recommend dynamic dampening or section reinforcement."
        : "SAFE DYNAMIC STATE: Transient impact load remains within elastic limits.";
    }

    return (
      `**GEMINI STRUCTURAL DIAGNOSTIC & REGIME ADVISORY**\n\n` +
      `• **Member Profile:** ${activeMaterial.name} | ${activeShape.name}\n` +
      `• **Column Classification:** ${activeResult.columnRegime} (Slenderness λ = ${activeResult.slenderness} vs Critical Boundary λ_c = ${activeResult.slenderness_critical})\n\n` +
      `• **Active ${loadTab.toUpperCase()} Mode Diagnostics:**\n  ${modeDetails}\n\n` +
      `• **Engineering Recommendations:**\n  ${recs}` +
      (errorMessage ? `\n\n*Fallback insight generated because AI route failed: ${errorMessage}*` : '')
    );
  };

  // AI Analysis Handler
  const fetchAiAnalysis = async () => {
    setAiLoading(true);
    setAiAnalysis('');
    setError('');

    try {
      const response = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: {
            P_kn: loadTab === 'static' ? inputs.P_static_kn : loadTab === 'fatigue' ? inputs.P_mean_kn + inputs.P_alt_kn : undefined,
            P_static_kn: inputs.P_static_kn,
            P_mean_kn: inputs.P_mean_kn,
            P_alt_kn: inputs.P_alt_kn,
            drop_mass_kg: inputs.drop_mass_kg,
            drop_h_mm: inputs.drop_h_mm,
            L_m: inputs.L_m,
            E_gpa: activeMaterial.E_gpa,
            I_cm4: activeShape.I_cm4,
            A_cm2: activeShape.A_cm2,
            condition: inputs.condition,
            loadTab,
          },
          result: {
            P_cr_kn: activeResult.P_cr_kn,
            safety_factor: loadTab === 'static' ? activeResult.static_fos : loadTab === 'fatigue' ? activeResult.fatigue_fos : activeResult.impact_fos,
            slenderness: activeResult.slenderness,
            isBuckled: isFailed,
          }
        })
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || `AI service returned status ${response.status}`);
      }

      setAiAnalysis(data.analysis || generateFallbackAiAnalysis('AI service returned no analysis text.'));
    } catch (err) {
      console.warn('[AI Insights] fallback engaged:', err?.message || err);
      setAiAnalysis(generateFallbackAiAnalysis(err?.message || 'Unknown error'));
    } finally {
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
              <Layers className="w-6 h-6" /> Buckling Lab
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              Your live structural workshop for columns, knots, and stability diagnostics.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => {
              const payload = { inputs, presets: { selectedMaterial, selectedShape }, results: activeResult };
              const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = 'beam-buckling-results.json'; a.click(); URL.revokeObjectURL(url);
            }} className="text-xs px-3 py-1 rounded-md bg-slate-800/60 hover:bg-slate-800/80 border border-slate-700 text-slate-200">Export Results</button>
          </div>
        </header>
        <ToolInstructions
          title="Beam Buckling"
          subtitle="Select materials, boundary conditions, and loading scenarios to reveal structural stability and risk paths."
          quick="1. Pick a profile · 2. Set the load · 3. Read the safety pulse"
          steps={[
            'Choose a section and material preset then tune the span and fixity.',
            'Set static, fatigue, or impact loading to explore different failure mechanisms.',
            'Review the diagrams and AI advisory to understand whether the member is safe or at risk.'
          ]}
        />

        {/* Load Regime Mode Selection Tabs */}
        <div className="grid grid-cols-3 gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 font-mono text-xs">
          <button
            onClick={() => setLoadTab('static')}
            className={`py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all ${
              loadTab === 'static'
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Gauge className="w-4 h-4" /> 1. Static Load Regime
          </button>

          <button
            onClick={() => setLoadTab('fatigue')}
            className={`py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all ${
              loadTab === 'fatigue'
                ? 'bg-purple-500 text-slate-950 shadow-lg shadow-purple-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Repeat className="w-4 h-4" /> 2. Fatigue Load Regime
          </button>

          <button
            onClick={() => setLoadTab('impact')}
            className={`py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all ${
              loadTab === 'impact'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Zap className="w-4 h-4" /> 3. Impact Load Regime
          </button>
        </div>

        {/* Workspace 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Column: Controls & Presets (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            
            {/* Database / Library Selection Card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center gap-2 border-b border-slate-800 pb-3">
                <Cpu className="w-4 h-4 text-cyan-400" /> Material & Cross-Section Library
              </h3>

              <div className="space-y-4 text-xs font-mono">
                {/* Material Selection & Redirect */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-slate-400">Selected Material</label>
                    <button
                      onClick={() => router.push('/mymaterials')}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                    >
                      <PlusCircle className="w-3 h-3" /> Manage / Add Materials <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  <select
                    value={selectedMaterial}
                    onChange={(e) => setSelectedMaterial(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                  >
                    {Object.entries(materialPresets).map(([key, mat]) => (
                      <option key={key} value={key}>{mat.name}</option>
                    ))}
                  </select>

                  {/* Quick Material Info Card */}
                  <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80 text-[11px] grid grid-cols-2 gap-1 text-slate-400">
                    <div>Modulus (E): <span className="text-slate-200">{activeMaterial.E_gpa} GPa</span></div>
                    <div>Yield (S<sub>y</sub>): <span className="text-slate-200">{activeMaterial.S_y} MPa</span></div>
                    <div>Tensile (S<sub>u</sub>): <span className="text-slate-200">{activeMaterial.S_u} MPa</span></div>
                    <div>Endurance (S<sub>e</sub>): <span className="text-slate-200">{activeMaterial.S_e} MPa</span></div>
                  </div>
                </div>

                {/* Cross-Section Selection & Redirect */}
                <div className="space-y-2 pt-2 border-t border-slate-800/60">
                  <div className="flex justify-between items-center">
                    <label className="text-slate-400">Selected Geometry Profile</label>
                    <button
                      onClick={() => router.push('/myshapes')}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                    >
                      <PlusCircle className="w-3 h-3" /> Manage / Add Shapes <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  <select
                    value={selectedShape}
                    onChange={(e) => setSelectedShape(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                  >
                    {Object.entries(shapePresets).map(([key, shape]) => (
                      <option key={key} value={key}>{shape.name}</option>
                    ))}
                  </select>

                  {/* Quick Shape Info Card */}
                  <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80 text-[11px] grid grid-cols-2 gap-1 text-slate-400">
                    <div>Inertia (I): <span className="text-slate-200">{activeShape.I_cm4} cm⁴</span></div>
                    <div>Area (A): <span className="text-slate-200">{activeShape.A_cm2} cm²</span></div>
                    <div>Outer Depth (d): <span className="text-slate-200">{activeShape.depth_mm} mm</span></div>
                    <div>Modulus (Z): <span className="text-slate-200">{activeResult?.Z_cm3 || '-'} cm³</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Member Column Boundary & Length Inputs */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center gap-2 border-b border-slate-800 pb-3">
                <Sliders className="w-4 h-4 text-cyan-400" /> Column Setup Parameters
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                {/* Boundary condition */}
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

                {/* Length L */}
                <div className="col-span-2">
                  <label className="block text-slate-400 mb-1">Column Span Length L (m)</label>
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

            {/* TAB 1: STATIC INPUTS */}
            {loadTab === 'static' && (
              <div className="bg-slate-900/60 border border-cyan-500/30 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Gauge className="w-4 h-4 text-cyan-400" /> Static Loading Parameters
                </h3>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Use the static mode to assess a constant axial load with eccentricity. This panel shows how the member responds under elastic buckling and combined bending stress, and it calculates the static safety factor for the selected material and section.
                </p>

                <div className="space-y-4 text-xs font-mono">
                  <div>
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>Static Load (P<sub>static</sub>)</span>
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
                      {activeResult && <span className="text-cyan-400 font-bold">Gov. P<sub>cr</sub>: {activeResult.P_cr_kn} kN</span>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Load Eccentricity e (mm)</label>
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

            {/* TAB 2: FATIGUE INPUTS */}
            {loadTab === 'fatigue' && (
              <div className="bg-slate-900/60 border border-purple-500/30 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-mono uppercase tracking-wider text-purple-400 font-semibold flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Repeat className="w-4 h-4 text-purple-400" /> Goodman Fatigue Parameters
                </h3>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  The fatigue tab evaluates cyclic mean and alternating loads using a Modified Goodman approach. Enter the mean load, alternating amplitude, and stress concentration factor to estimate fatigue utilization and determine whether the section is safe under repeated loading.
                </p>

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
                    <label className="block text-slate-400 mb-1">Alt Load P<sub>a</sub> (kN)</label>
                    <input 
                      type="number" 
                      name="P_alt_kn" 
                      value={inputs.P_alt_kn} 
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-slate-400 mb-1">Stress Concentration Factor K<sub>t</sub></label>
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

            {/* TAB 3: DYNAMIC IMPACT INPUTS */}
            {loadTab === 'impact' && (
              <div className="bg-slate-900/60 border border-amber-500/30 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-mono uppercase tracking-wider text-amber-400 font-semibold flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Zap className="w-4 h-4 text-amber-400" /> Dynamic Impact Parameters
                </h3>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Impact mode models a dropped mass striking the column and computes the dynamic amplification factor. Use this tab to estimate the peak impact load and check whether the section can withstand transient shock loading without buckling.
                </p>

                <div className="space-y-3 text-xs font-mono">
                  <div>
                    <label className="block text-slate-400 mb-1">Impact Drop Mass (kg)</label>
                    <input 
                      type="number" 
                      name="drop_mass_kg" 
                      value={inputs.drop_mass_kg} 
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Drop Height (mm)</label>
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

          {/* Right Column: Unified Multi-Diagram Dashboard (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* 3D Preview Panel */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-cyan-300">3D Column Buckling Preview</h3>
                  <p className="text-xs text-slate-400">Interactive vertical column buckling visualization with stress heatmap.</p>
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  {beamRenderParams.lengthL.toFixed(2)}m × {(beamRenderParams.widthB * 1000).toFixed(0)}mm × {(beamRenderParams.heightH * 1000).toFixed(0)}mm
                </div>
              </div>

              <div className="h-[340px] rounded-3xl overflow-hidden bg-slate-950/80 border border-slate-800">
                <DynamicCanvasWrapper {...beamRenderParams} />
              </div>
            </div>

            {/* Structural Status Banner */}
            {activeResult && (
              <div className={`p-4 rounded-2xl border transition-all ${
                isFailed
                  ? 'bg-rose-950/40 border-rose-500/50 text-rose-300' 
                  : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
              } flex items-center justify-between`}>
                <div className="space-y-0.5">
                  <span className="text-[11px] font-mono uppercase text-slate-400">
                    Active Mode Status ({loadTab.toUpperCase()})
                  </span>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    {isFailed ? (
                      <>
                        <ShieldAlert className="w-5 h-5 text-rose-500 animate-bounce" /> 
                        <span className="text-rose-400">LIMIT STATE EXCEEDED</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5 text-emerald-400" /> 
                        <span className="text-emerald-400 font-bold">STRUCTURALLY SAFE</span>
                      </>
                    )}
                  </h3>
                </div>

                <div className="text-right font-mono">
                  <div className="text-[10px] text-slate-400">Factor of Safety</div>
                  <div className={`text-xl font-extrabold ${isFailed ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {loadTab === 'static' ? activeResult.static_fos : loadTab === 'fatigue' ? activeResult.fatigue_fos : activeResult.impact_fos}
                  </div>
                </div>
              </div>
            )}

            {/* SINGLE PAGE DIAGRAMS DASHBOARD */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-5">
              <h4 className="text-xs font-mono uppercase text-slate-300 font-semibold flex items-center gap-2 border-b border-slate-800 pb-3">
                <Gauge className="w-4 h-4 text-cyan-400" /> Integrated Diagrams Dashboard
              </h4>

              <div className="space-y-4">
                
                {/* 1. Deflection Curve */}
                <div className="bg-slate-950 rounded-xl border border-slate-800 p-3 shadow-inner space-y-1">
                  <div className="flex justify-between text-[11px] font-mono text-cyan-400">
                    <span className="flex items-center gap-1.5 font-bold">
                      <Maximize2 className="w-3.5 h-3.5" /> 1. Elastic Deflection Profile y(x)
                    </span>
                    <span className="text-slate-400">Span L = {inputs.L_m}m</span>
                  </div>
                  <div className="h-24 w-full relative flex items-center justify-center">
                    <svg className="w-full h-full" viewBox="0 0 500 60" preserveAspectRatio="none">
                      <line x1="0" y1="30" x2="500" y2="30" stroke="#334155" strokeDasharray="4 4" strokeWidth="1" />
                      <path
                        d={getDeflectionPath(60)}
                        fill="none"
                        stroke={isFailed ? "#f43f5e" : loadTab === 'impact' ? "#f59e0b" : "#06b6d4"}
                        strokeWidth="2.5"
                        className="transition-all duration-300"
                      />
                    </svg>
                  </div>
                </div>

                {/* 2. Shear Force Diagram (SFD) */}
                <div className="bg-slate-950 rounded-xl border border-slate-800 p-3 shadow-inner space-y-1">
                  <div className="flex justify-between text-[11px] font-mono text-amber-400">
                    <span className="flex items-center gap-1.5 font-bold">
                      <BarChart2 className="w-3.5 h-3.5" /> 2. Shear Force Diagram (SFD)
                    </span>
                    <span>V<sub>max</sub> = {activeMomentsAndShears.V_max} kN</span>
                  </div>
                  <div className="h-24 w-full relative flex items-center justify-center">
                    <svg className="w-full h-full" viewBox="0 0 500 60" preserveAspectRatio="none">
                      <line x1="0" y1="30" x2="500" y2="30" stroke="#334155" strokeDasharray="4 4" strokeWidth="1" />
                      <path d={getSFDPath(60).area} fill="#f59e0b" opacity="0.25" />
                      <path d={getSFDPath(60).line} fill="none" stroke="#f59e0b" strokeWidth="2" />
                    </svg>
                  </div>
                </div>

                {/* 3. Bending Moment Diagram (BMD) */}
                <div className="bg-slate-950 rounded-xl border border-slate-800 p-3 shadow-inner space-y-1">
                  <div className="flex flex-wrap justify-between gap-2 text-[11px] font-mono text-purple-400">
                    <span className="flex items-center gap-1.5 font-bold min-w-0">
                      <TrendingUp className="w-3.5 h-3.5" /> 3. Bending Moment Diagram (BMD)
                    </span>
                    <span className="min-w-max">M<sub>max</sub> = {activeMomentsAndShears.M_max} kN·m</span>
                  </div>
                  <div className="h-24 w-full relative flex items-center justify-center">
                    <svg className="w-full h-full" viewBox="0 0 520 60" preserveAspectRatio="none">
                      <line x1="0" y1="30" x2="500" y2="30" stroke="#334155" strokeDasharray="4 4" strokeWidth="1" />
                      <path d={getBMDPath(60).area} fill="#a855f7" opacity="0.25" />
                      <path d={getBMDPath(60).line} fill="none" stroke="#a855f7" strokeWidth="2" />
                    </svg>
                  </div>
                </div>

                {/* 4. Goodman Fatigue Plot */}
                {activeResult && loadTab === 'fatigue' && (
                  <div className="bg-slate-950 rounded-xl border border-slate-800 p-3 shadow-inner space-y-1 font-mono">
                    <div className="flex justify-between text-[11px] text-purple-300">
                      <span className="flex items-center gap-1.5 font-bold">
                        <Scale className="w-3.5 h-3.5 text-purple-400" /> 4. Modified Goodman Diagram (&sigma;_a vs &sigma;_m)
                      </span>
                      <span>Index: {activeResult.goodman_utilization}</span>
                    </div>
                    <div className="h-32 w-full relative flex items-center justify-center pt-2">
                      <svg className="w-full h-full overflow-visible" viewBox="0 0 300 110">
                        <line x1="30" y1="90" x2="280" y2="90" stroke="#475569" strokeWidth="1.5" />
                        <line x1="30" y1="10" x2="30" y2="90" stroke="#475569" strokeWidth="1.5" />

                        <text x="280" y="105" fill="#94a3b8" fontSize="8" textAnchor="end">&sigma;_m (S_u = {activeMaterial.S_u} MPa)</text>
                        <text x="10" y="15" fill="#94a3b8" fontSize="8" transform="rotate(-90 15,20)">&sigma;_a (S_e = {activeMaterial.S_e} MPa)</text>

                        <line x1="30" y1="20" x2="250" y2="90" stroke="#a855f7" strokeWidth="2" strokeDasharray="3 3" />

                        {(() => {
                          const cx = 30 + Math.min((parseFloat(activeResult.sigma_mean_mpa) / (activeMaterial.S_u || 1)) * 220, 240);
                          const cy = 90 - Math.min((parseFloat(activeResult.sigma_alt_mpa) / (activeMaterial.S_e || 1)) * 70, 80);
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

              </div>
            </div>

            {/* Error Message */}
            {displayedError && (
              <div className="bg-red-950/40 border border-red-500/50 p-4 rounded-xl text-red-400 text-xs flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>{displayedError}</span>
              </div>
            )}

            {/* Computed Metrics Section */}
            {activeResult && (
              <>
                <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex items-center justify-between font-mono text-xs">
                  <div className="flex items-center gap-2.5 text-cyan-400">
                    <Compass className="w-4 h-4 shrink-0" />
                    <span>Column Classification: <strong className="text-white">{activeResult.columnRegime}</strong></span>
                  </div>
                  <div className="text-slate-400">
                    &lambda; = {activeResult.slenderness} | &lambda;<sub>c</sub> = {activeResult.slenderness_critical}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                  <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
                    <span className="text-slate-500 block">Gov. Buckling Load (P<sub>cr</sub>)</span>
                    <span className="text-cyan-400 text-sm font-bold">{activeResult.P_cr_kn} kN</span>
                  </div>

                  <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
                    <span className="text-slate-500 block">Max Bending (M<sub>max</sub>)</span>
                    <span className="text-purple-400 text-sm font-bold">{activeMomentsAndShears.M_max} kN·m</span>
                  </div>

                  <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
                    <span className="text-slate-500 block">Max Shear (V<sub>max</sub>)</span>
                    <span className="text-amber-400 text-sm font-bold">{activeMomentsAndShears.V_max} kN</span>
                  </div>

                  <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
                    <span className="text-slate-500 block">Section Modulus (Z)</span>
                    <span className="text-slate-200 text-sm font-bold">{activeResult.Z_cm3} cm³</span>
                  </div>
                </div>

                {/* Gemini AI Advisor Section */}
                <div className="bg-slate-900/80 border border-cyan-500/30 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-cyan-400" />
                      <h4 className="text-sm font-bold text-white">Gemini Structural Oracle</h4>
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

                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 mt-6">
                  <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-3">
                    Key Terms for Beam Buckling
                  </h3>
                  <div className="grid gap-3 text-xs text-slate-300">
                    <div><strong>P_cr</strong>: Governing critical buckling load for the selected column and end conditions.</div>
                    <div><strong>Slenderness Ratio (λ)</strong>: Effective length divided by radius of gyration; higher values favor Euler buckling.</div>
                    <div><strong>Effective Length Factor (K)</strong>: Multiplier based on boundary conditions (pinned, fixed, free) that changes buckling length.</div>
                    <div><strong>Factor of Safety (FOS)</strong>: Ratio of buckling capacity to applied axial load; values above 1.0 are safer.</div>
                    <div><strong>Goodman Utilization</strong>: Fatigue demand ratio combining mean and alternating stress against material strength.</div>
                    <div><strong>Eccentricity (e)</strong>: Offset of the load from the centroidal axis, creating bending in addition to axial stress.</div>
                  </div>
                </div>
              </>
            )}

          </div>

        </div>

      </main>
    </div>
  );
}