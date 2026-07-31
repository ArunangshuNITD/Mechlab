// lib/universal-coupling.js

/**
 * Calculates the angular velocity of the driven shaft (ω2) 
 * given the drive shaft velocity (ω1), intersection angle (α), and drive shaft angle (θ).
 * 
 * Formula: ω2 = (ω1 * cos(α)) / (1 - sin²(α) * cos²(θ))
 */
export function calculateDrivenVelocity(omega1, alphaDeg, thetaDeg) {
  const alphaRad = (alphaDeg * Math.PI) / 180;
  const thetaRad = (thetaDeg * Math.PI) / 180;

  const numerator = omega1 * Math.cos(alphaRad);
  const denominator = 1 - Math.pow(Math.sin(alphaRad), 2) * Math.pow(Math.cos(thetaRad), 2);
  
  return numerator / denominator;
}

/**
 * Generates data points for the velocity ratio chart over a full 360-degree rotation.
 */
export function generateKinematicData(omega1, alphaDeg) {
  const data = [];
  for (let theta = 0; theta <= 360; theta += 5) {
    const omega2 = calculateDrivenVelocity(omega1, alphaDeg, theta);
    data.push({
      theta,
      omega1: omega1, // Constant input velocity
      omega2: parseFloat(omega2.toFixed(2)), // Variable output velocity
    });
  }
  return data;
}