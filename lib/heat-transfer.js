// lib/heat-transfer.js

/**
 * Calculates 1D steady-state heat transfer through a composite wall
 * @param {Array} layers - Array of objects { name, thickness (m), k (W/mK) }
 * @param {Object} boundaries - { tInner (C), hInner (W/m2K), tOuter (C), hOuter (W/m2K) }
 * @param {Number} area - Cross-sectional area (m2)
 */
export function calculateCompositeWall(layers, boundaries, area = 1) {
  const { tInner, hInner, tOuter, hOuter } = boundaries;

  // 1. Calculate Resistances (K/W)
  const rInnerConv = 1 / (hInner * area);
  const rOuterConv = 1 / (hOuter * area);
  
  const layerResistances = layers.map(layer => ({
    ...layer,
    resistance: layer.thickness / (layer.k * area)
  }));

  const rTotal = rInnerConv + rOuterConv + layerResistances.reduce((sum, l) => sum + l.resistance, 0);

  // 2. Calculate Total Heat Transfer Rate (W) and Heat Flux (W/m2)
  const q = (tInner - tOuter) / rTotal;
  const heatFlux = q / area;

  // 3. Calculate Interface Temperatures for the graph
  const temperatureProfile = [];
  let currentTemp = tInner;
  let currentDistance = 0;

  // Inner Fluid
  temperatureProfile.push({ x: currentDistance, temp: currentTemp, label: 'Inner Fluid' });
  
  // Inner Surface (after convection drop)
  currentTemp -= q * rInnerConv;
  temperatureProfile.push({ x: currentDistance, temp: currentTemp, label: 'Inner Surface' });

  // Through each layer
  layerResistances.forEach((layer, index) => {
    currentDistance += layer.thickness;
    currentTemp -= q * layer.resistance;
    temperatureProfile.push({ 
      x: currentDistance, 
      temp: currentTemp, 
      label: `Interface ${index + 1}` 
    });
  });

  // Outer Fluid (should match tOuter)
  temperatureProfile.push({ x: currentDistance, temp: tOuter, label: 'Outer Fluid' });

  return {
    q,
    heatFlux,
    rTotal,
    overallU: 1 / (rTotal * area),
    temperatureProfile,
    layerResistances
  };
}