import fs from 'fs';

/**
 * Calculates Euler column buckling parameters and generates a deflection curve.
 * @param {Object} params - Input parameters for the buckling calculation
 * @returns {Object} Calculated metrics and deflection curve points
 */
export function calculateBuckling(params = {}) {
  // Inputs & Unit Conversions
  const E = parseFloat(params.E_gpa ?? 200) * 1e9;        // GPa to Pa
  const I = parseFloat(params.I_cm4 ?? 1500) * 1e-8;      // cm^4 to m^4
  const A = parseFloat(params.A_cm2 ?? 50) * 1e-4;        // cm^2 to m^2
  const L = parseFloat(params.L_m ?? 3.0);                // Meters
  const P_applied = parseFloat(params.P_kn ?? 0) * 1e3;   // kN to N
  const condition = params.condition ?? 'pinned_pinned';

  // Effective Length Factor (K)
  const kFactors = {
    pinned_pinned: 1.0,
    fixed_fixed: 0.5,
    fixed_pinned: 0.7,
    fixed_free: 2.0
  };
  const K = kFactors[condition] ?? 1.0;
  const L_e = K * L;

  // Core Engineering Equations
  const P_cr = (Math.PI ** 2 * E * I) / (L_e ** 2);        // Critical Buckling Load (N)
  const r = Math.sqrt(I / A);                              // Radius of Gyration (m)
  const slenderness = L_e / r;                             // Slenderness Ratio (λ)
  const sigma_cr = P_cr / A;                               // Critical Stress (Pa)
  
  // Safety factor is Infinite when zero load is applied
  const safety_factor = P_applied > 0 ? P_cr / P_applied : "∞";
  const is_buckled = P_applied > 0 && P_applied >= P_cr;

  // Rounding Helper Function
  const round = (val, decimals = 2) => 
    typeof val === 'number' ? Math.round(val * 10 ** decimals) / 10 ** decimals : val;

  // Generate Deflection Profile Curve (50 points for visualization)
  const curve_points = [];
  const num_points = 50;

  for (let i = 0; i <= num_points; i++) {
    const x = (i / num_points) * L;
    let deflection = 0;

    // Buckling shape approximations per support condition
    if (P_applied > 0) {
      if (condition === 'fixed_fixed') {
        deflection = 0.5 * (1 - Math.cos((2 * Math.PI * x) / L));
      } else if (condition === 'fixed_free') {
        deflection = 1 - Math.cos((Math.PI * x) / (2 * L));
      } else if (condition === 'fixed_pinned') {
        deflection = 0.5 * (1 - Math.cos((1.43 * Math.PI * x) / L));
      } else {
        // Default / pinned-pinned
        deflection = Math.sin((Math.PI * x) / L);
      }
    }

    curve_points.push({
      x_ratio: round(x / L, 3),
      deflection: round(deflection, 4)
    });
  }

  return {
    P_cr_kn: round(P_cr / 1000, 2),
    P_applied_kn: round(P_applied / 1000, 2),
    sigma_cr_mpa: round(sigma_cr / 1e6, 2),
    slenderness: round(slenderness, 2),
    radius_of_gyration_mm: round(r * 1000, 2),
    effective_length_m: round(L_e, 2),
    K_factor: K,
    safety_factor: round(safety_factor, 2),
    is_buckled: is_buckled,
    curve_points: curve_points
  };
}

// CLI Execution support (when run directly via terminal: `node lib/buckling.js`)
if (process.argv[1] && process.argv[1].endsWith('buckling.js')) {
  try {
    const inputData = JSON.parse(fs.readFileSync(0, 'utf-8')); // Read stdin synchronously
    const result = calculateBuckling(inputData);
    console.log(JSON.stringify(result));
  } catch (e) {
    console.log(JSON.stringify({ error: e.message }));
  }
}