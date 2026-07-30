/**
 * Centrifugal Pump Analysis Engine
 * Calculates Dynamic Head, Friction Losses, Power Requirements, NPSH, Efficiency,
 * and generates H-Q Operating Point curves.
 */

export const FLUID_PRESETS = {
  water20: { name: "Water (20°C)", density: 998.2, viscosity: 1.002e-3, vaporPressure: 2338 },
  water50: { name: "Water (50°C)", density: 988.0, viscosity: 0.547e-3, vaporPressure: 12350 },
  water80: { name: "Water (80°C)", density: 971.8, viscosity: 0.355e-3, vaporPressure: 47390 },
  diesel: { name: "Diesel Fuel (15°C)", density: 850.0, viscosity: 3.0e-3, vaporPressure: 1000 },
};

export function analyzePump(params) {
  const g = 9.81;
  const Patm = params.patm || 101325; // Atmospheric pressure (Pa)

  // Fluid properties
  const rho = params.density || 998.2; // kg/m³
  const mu = params.viscosity || 1.002e-3; // Pa·s
  const Pvp = params.vaporPressure || 2338; // Pa

  // Operating condition
  const Q_m3h = params.flowRate; // m³/h
  const Q = Q_m3h / 3600; // m³/s
  const N = params.rpm; // RPM

  // Geometries
  const Hs = params.suctionHead; // Suction static lift (m)
  const Hd = params.deliveryHead; // Delivery static head (m)
  const Ls = params.suctionLength; // Suction pipe length (m)
  const Ld = params.deliveryLength; // Delivery pipe length (m)
  const Ds = params.suctionDiameter; // Suction pipe inner diameter (m)
  const Dd = params.deliveryDiameter; // Delivery pipe inner diameter (m)
  const f = params.frictionFactor || 0.02; // Pipe friction factor

  // Impeller parameters
  const D2 = params.impellerDiameter; // Outer impeller diameter (m)
  const b2 = params.impellerWidth; // Impeller outlet width (m)
  const beta2_deg = params.bladeAngle; // Impeller blade angle at exit (deg)
  const beta2 = (beta2_deg * Math.PI) / 180;

  // 1. Flow Velocities
  const As = (Math.PI / 4) * Math.pow(Ds, 2);
  const Ad = (Math.PI / 4) * Math.pow(Dd, 2);
  const Vs = Q / As; // Suction velocity (m/s)
  const Vd = Q / Ad; // Delivery velocity (m/s)

  // 2. Friction Head Losses (Darcy-Weisbach)
  const hfs = f * (Ls / Ds) * (Math.pow(Vs, 2) / (2 * g));
  const hfd = f * (Ld / Dd) * (Math.pow(Vd, 2) / (2 * g));
  const TotalFrictionHead = hfs + hfd;

  // 3. Total Dynamic Head (TDH)
  const StaticHead = Hs + Hd;
  const VelocityHeadGain = Math.pow(Vd, 2) / (2 * g);
  const TDH = StaticHead + TotalFrictionHead + VelocityHeadGain;

  // 4. Impeller Kinematics & Euler Head
  const U2 = (Math.PI * D2 * N) / 60; // Tangential impeller speed at outlet (m/s)
  const Vf2 = Q / (Math.PI * D2 * b2); // Radial flow velocity at outlet (m/s)
  const Vu2 = U2 - Vf2 / Math.tan(beta2); // Tangential fluid velocity component
  const EulerHead = (U2 * Vu2) / g;

  // 5. Efficiency & Power
  const HydraulicEff = Math.min(Math.max((TDH / (EulerHead > 0 ? EulerHead : TDH + 5)) * 100, 40), 92);
  const MechanicalEff = 0.95;
  const OverallEfficiency = HydraulicEff * MechanicalEff; // %

  const WaterPower = (rho * g * Q * TDH) / 1000; // kW
  const ShaftPower = WaterPower / (OverallEfficiency / 100); // kW

  // 6. Net Positive Suction Head Available (NPSHa)
  const AtmosphericHead = Patm / (rho * g);
  const VaporHead = Pvp / (rho * g);
  const NPSHa = AtmosphericHead - VaporHead - Hs - hfs;

  // 7. Cavitation Safety Margin
  const NPSHr = params.npshr || 2.5; // Required NPSH (m)
  const NPSHMargin = NPSHa - NPSHr;
  const isCavitationSafe = NPSHMargin > 0.5;

  // 8. Generate System Head Curve & Pump HQ Curve Data Points
  const maxQ = Math.max(Q_m3h * 1.8, 120);
  const curveData = [];

  for (let q = 0; q <= maxQ; q += maxQ / 25) {
    const q_m3s = q / 3600;
    const v_s = q_m3s / As;
    const v_d = q_m3s / Ad;
    
    // System Head Curve
    const h_fs_i = f * (Ls / Ds) * (Math.pow(v_s, 2) / (2 * g));
    const h_fd_i = f * (Ld / Dd) * (Math.pow(v_d, 2) / (2 * g));
    const systemHead = StaticHead + h_fs_i + h_fd_i + Math.pow(v_d, 2) / (2 * g);

    // Pump HQ Curve (Theoretical shut-off head modeled with parabolic drop)
    const H_shutoff = EulerHead * 1.1;
    const pumpHead = Math.max(0, H_shutoff - (H_shutoff - TDH) * Math.pow(q / Q_m3h, 2));

    curveData.push({
      flow: Number(q.toFixed(1)),
      systemHead: Number(systemHead.toFixed(2)),
      pumpHead: Number(pumpHead.toFixed(2)),
    });
  }

  return {
    velocities: { Vs: Number(Vs.toFixed(2)), Vd: Number(Vd.toFixed(2)) },
    losses: { hfs: Number(hfs.toFixed(2)), hfd: Number(hfd.toFixed(2)), totalFriction: Number(TotalFrictionHead.toFixed(2)) },
    heads: { staticHead: Number(StaticHead.toFixed(2)), tdh: Number(TDH.toFixed(2)), eulerHead: Number(EulerHead.toFixed(2)) },
    powers: { waterPower: Number(WaterPower.toFixed(2)), shaftPower: Number(ShaftPower.toFixed(2)) },
    efficiencies: { hydraulic: Number(HydraulicEff.toFixed(1)), overall: Number(OverallEfficiency.toFixed(1)) },
    npsh: { npsha: Number(NPSHa.toFixed(2)), npshr: NPSHr, margin: Number(NPSHMargin.toFixed(2)), safe: isCavitationSafe },
    impellerSpeed: Number(U2.toFixed(2)),
    curveData,
  };
}