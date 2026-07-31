import fs from 'fs';

/**
 * Preset Structural Material Database
 */
export const MATERIAL_DATABASE = {
  steel_a36: {
    id: 'steel_a36',
    name: 'Structural Steel A36',
    density: 7850,       // kg/m^3
    E_gpa: 200,          // GPa
    G_gpa: 79.3,         // GPa
    yield_mpa: 250,      // MPa
  },
  aluminum_6061: {
    id: 'aluminum_6061',
    name: 'Aluminum 6061-T6',
    density: 2700,
    E_gpa: 68.9,
    G_gpa: 26,
    yield_mpa: 276,
  },
  titanium_gr5: {
    id: 'titanium_gr5',
    name: 'Titanium Grade 5 (Ti-6Al-4V)',
    density: 4430,
    E_gpa: 113.8,
    G_gpa: 44,
    yield_mpa: 880,
  },
  cast_iron: {
    id: 'cast_iron',
    name: 'Gray Cast Iron Class 40',
    density: 7150,
    E_gpa: 124,
    G_gpa: 48,
    yield_mpa: 290,
  },
  custom: {
    id: 'custom',
    name: 'Custom Material',
    density: 7850,
    E_gpa: 200,
    G_gpa: 79.3,
    yield_mpa: 250,
  },
};

/**
 * Calculates Euler column buckling and bending stress parameters.
 * @param {Object} params - Input engineering parameters
 * @returns {Object} Comprehensive stress, buckling, and deflection metrics
 */
export function calculateBuckling(params = {}) {
  // 1. Material Properties Resolution
  const matKey = params.material || 'steel_a36';
  const matPreset = MATERIAL_DATABASE[matKey] || MATERIAL_DATABASE.steel_a36;

  const E = parseFloat(params.E_gpa ?? matPreset.E_gpa) * 1e9;               // GPa to Pa
  const yieldStrength = parseFloat(params.yield_mpa ?? matPreset.yield_mpa) * 1e6; // MPa to Pa
  const density = parseFloat(params.density ?? matPreset.density);           // kg/m^3

  // 2. Geometry & Dimensions
  const L = parseFloat(params.L_m ?? 3.0);                                  // Length in Meters
  const b = params.width_m ? parseFloat(params.width_m) : null;              // Width (m)
  const h = params.height_m ? parseFloat(params.height_m) : null;            // Height (m)

  // Calculate Area (A) and Moment of Inertia (I) from b & h if supplied; fallback to explicit I and A
  let A = params.A_cm2 ? parseFloat(params.A_cm2) * 1e-4 : 0.005; // default 50 cm^2
  let I = params.I_cm4 ? parseFloat(params.I_cm4) * 1e-8 : 0.000015; // default 1500 cm^4

  if (b && h) {
    A = b * h;
    I = (b * Math.pow(h, 3)) / 12;
  }

  // 3. Force Inputs
  const P_applied = parseFloat(params.P_kn ?? 0) * 1e3;                     // kN to N
  const condition = params.condition ?? 'pinned_pinned';

  // Effective Length Factor (K)
  const kFactors = {
    pinned_pinned: 1.0,
    fixed_fixed: 0.5,
    fixed_pinned: 0.7,
    fixed_free: 2.0, // Cantilever
  };
  const K = kFactors[condition] ?? 1.0;
  const L_e = K * L;

  // 4. Core Engineering Equations
  // Critical Buckling Load (N)
  const P_cr = (Math.PI ** 2 * E * I) / (L_e ** 2);
  const r = Math.sqrt(I / A);                                               // Radius of Gyration (m)
  const slenderness = L_e / r;                                              // Slenderness Ratio (λ)
  const sigma_cr = P_cr / A;                                                // Critical Buckling Stress (Pa)

  // Max Bending Stress (sigma_max = M * c / I)
  // Assumes transverse bending for fixed-free cantilever; or standard flexure
  const c = h ? h / 2 : Math.sqrt((3 * I) / Math.max(A, 0.0001));           // Distance to outer fiber
  const maxMoment = P_applied * L;
  const maxBendingStress = I > 0 ? (maxMoment * c) / I : 0;                 // Pa

  // Safety Factors
  const bucklingSafetyFactor = P_applied > 0 ? P_cr / P_applied : Infinity;
  const yieldSafetyFactor = maxBendingStress > 0 ? yieldStrength / maxBendingStress : Infinity;
  
  const is_buckled = P_applied > 0 && P_applied >= P_cr;
  const is_yielded = maxBendingStress >= yieldStrength;

  // Rounding Helper
  const round = (val, decimals = 2) =>
    typeof val === 'number' && isFinite(val)
      ? Math.round(val * 10 ** decimals) / 10 ** decimals
      : val === Infinity
      ? '∞'
      : val;

  // 5. Generate Deflection Curve (50 interpolation points for UI visualizers)
  const curve_points = [];
  const num_points = 50;

  for (let i = 0; i <= num_points; i++) {
    const x = (i / num_points) * L;
    let deflection = 0;

    if (P_applied > 0) {
      if (condition === 'fixed_fixed') {
        deflection = 0.5 * (1 - Math.cos((2 * Math.PI * x) / L));
      } else if (condition === 'fixed_free') {
        deflection = 1 - Math.cos((Math.PI * x) / (2 * L));
      } else if (condition === 'fixed_pinned') {
        deflection = 0.5 * (1 - Math.cos((1.43 * Math.PI * x) / L));
      } else {
        // Pinned-Pinned
        deflection = Math.sin((Math.PI * x) / L);
      }
    }

    curve_points.push({
      x_ratio: round(x / L, 3),
      deflection: round(deflection, 4),
    });
  }

  return {
    material: matPreset.name,
    E_gpa: round(E / 1e9, 2),
    yield_mpa: round(yieldStrength / 1e6, 2),
    density_kg_m3: density,
    P_cr_kn: round(P_cr / 1000, 2),
    P_applied_kn: round(P_applied / 1000, 2),
    sigma_cr_mpa: round(sigma_cr / 1e6, 2),
    max_bending_stress_mpa: round(maxBendingStress / 1e6, 2),
    slenderness: round(slenderness, 2),
    radius_of_gyration_mm: round(r * 1000, 2),
    effective_length_m: round(L_e, 2),
    K_factor: K,
    buckling_safety_factor: round(bucklingSafetyFactor, 2),
    yield_safety_factor: round(yieldSafetyFactor, 2),
    is_buckled,
    is_yielded,
    curve_points,
  };
}

// CLI Execution support (when executed via direct terminal call: `node lib/buckling.js`)
if (process.argv[1] && process.argv[1].endsWith('buckling.js')) {
  try {
    const inputData = JSON.parse(fs.readFileSync(0, 'utf-8'));
    const result = calculateBuckling(inputData);
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.log(JSON.stringify({ error: e.message }));
  }
}