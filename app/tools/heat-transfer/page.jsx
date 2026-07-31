// app/tools/heat-transfer/page.jsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts';
// Assuming lucide-react is installed based on standard Next.js dashboards
import { Activity, Thermometer, Layers, Info, Plus, Trash2, Bot } from 'lucide-react'; 
import ToolInstructions from '@/app/components/ToolInstructions';

export default function HeatTransferPage() {
  // State for Boundary Conditions
  const [boundaries, setBoundaries] = useState({
    tInner: 200, // °C
    hInner: 25,  // W/m2K
    tOuter: -10, // °C
    hOuter: 15   // W/m2K
  });

  // State for Layers
  const [layers, setLayers] = useState([
    { id: 1, name: 'Firebrick', thickness: 0.1, k: 1.4 },
    { id: 2, name: 'Insulation', thickness: 0.05, k: 0.04 },
    { id: 3, name: 'Steel Shell', thickness: 0.01, k: 45 }
  ]);

  const [results, setResults] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Auto-calculate on state change
  useEffect(() => {
    const fetchResults = async () => {
      const res = await fetch('/api/heat-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layers, boundaries, area: 1 })
      });
      const data = await res.json();
      setResults(data);
    };
    
    fetchResults();
  }, [layers, boundaries]);

  const generateFallbackAiAnalysis = (errorMessage) => {
    const flux = results ? (results.heatFlux.toFixed(2) + ' W/m2') : 'N/A';
    const overallU = results ? (results.overallU.toFixed(3) + ' W/m2K') : 'N/A';
    const dominant = results && results.layerResistances && results.layerResistances.length > 0
      ? [...results.layerResistances].sort((a,b) => b.resistance - a.resistance)[0].name
      : 'N/A';

    return (
      `**GEMINI THERMAL DIAGNOSTIC & ADVISORY**\n\n` +
      `• **Summary Metrics:** Heat Flux = ${flux} | Overall U = ${overallU}\n` +
      `• **Total Layers:** ${layers.length} | Total Thickness = ${totalLayerThickness.toFixed(3)} m\n\n` +
      `• **Dominant Thermal Resistance:** ${dominant}\n\n` +
      `• **Recommendations:**\n  - Improve insulation where resistance is highest or increase thickness.\n  - Reduce inner surface convection by increasing h_in or adding internal insulation if needed.` +
      (errorMessage ? `\n\n*Fallback insight generated because AI route failed: ${errorMessage}*` : '')
    );
  };

  const fetchAiAnalysis = async () => {
    setAiLoading(true);
    setAiAnalysis('');
    try {
      const response = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs: { layers, boundaries, area: 1 },
          result: {
            heatFlux: results?.heatFlux,
            overallU: results?.overallU,
            layerResistances: results?.layerResistances
          },
          tool: 'heat-transfer'
        })
      });

      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || `AI service returned ${response.status}`);
      setAiAnalysis(data.analysis || generateFallbackAiAnalysis('AI returned no analysis text'));
    } catch (err) {
      console.warn('[AI] heat-transfer fallback:', err?.message || err);
      setAiAnalysis(generateFallbackAiAnalysis(err?.message || 'Unknown'));
    } finally {
      setAiLoading(false);
    }
  };

  // Persist layers and boundaries locally
  useEffect(() => {
    try {
      const saved = localStorage.getItem('heat-transfer:layers');
      const savedB = localStorage.getItem('heat-transfer:boundaries');
      if (saved) setLayers(JSON.parse(saved));
      if (savedB) setBoundaries(JSON.parse(savedB));
    } catch (e) {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem('heat-transfer:layers', JSON.stringify(layers)); } catch (e) {}
  }, [layers]);

  useEffect(() => {
    try { localStorage.setItem('heat-transfer:boundaries', JSON.stringify(boundaries)); } catch (e) {}
  }, [boundaries]);

  const exportResults = () => {
    const payload = { inputs: { layers, boundaries }, results };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'heat-transfer-results.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBoundaryChange = (e) => {
    setBoundaries({ ...boundaries, [e.target.name]: parseFloat(e.target.value) || 0 });
  };

  const handleLayerChange = (id, field, value) => {
    setLayers(layers.map(l => {
      if (l.id !== id) return l;
      return {
        ...l,
        [field]: field === 'name' ? value : parseFloat(value) || 0
      };
    }));
  };

  const addLayer = () => {
    setLayers(prev => [
      ...prev,
      {
        id: prev.length ? Math.max(...prev.map(l => l.id)) + 1 : 1,
        name: `Layer ${prev.length + 1}`,
        thickness: 0.05,
        k: 0.5
      }
    ]);
  };

  const removeLayer = (id) => {
    if (layers.length <= 1) return;
    setLayers(layers.filter(l => l.id !== id));
  };

  const totalLayerThickness = useMemo(() => {
    return layers.reduce((sum, layer) => sum + layer.thickness, 0);
  }, [layers]);

  const totalLayerResistance = useMemo(() => {
    return layers.reduce((sum, layer) => sum + (layer.k > 0 ? layer.thickness / layer.k : 0), 0);
  }, [layers]);

  // Prepare chart data colors mapping
  const chartAreas = useMemo(() => {
      if(!results) return [];
      let start = 0;
      return layers.map((layer, i) => {
          const end = start + layer.thickness;
          const area = { start, end, name: layer.name, color: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'][i%4] };
          start = end;
          return area;
      });
  }, [layers, results]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 p-6 font-sans">
      
      {/* Header */}
      <div className="mb-6 flex justify-between items-end border-b border-cyan-900/50 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Thermometer className="text-orange-500" />
            Thermal Conduction Forge
          </h1>
          <p className="text-slate-400 mt-2 text-sm">1D steady-state heat flow through composite wall assemblies.</p>
        </div>
      </div>

      <ToolInstructions
        title="Heat Transfer"
        subtitle="Build a layered thermal assembly, adjust boundary conditions, and reveal the heat path that drives your design."
        quick="1. Set boundaries · 2. Layer materials · 3. Read the thermal map"
        steps={[
          'Define inner and outer temperatures plus convection coefficients.',
          'Add or tune layers to model your insulation assembly.',
          'Follow the temperature gradient and resistance ranking to spot bottlenecks.',
          'Use the AI advisor to get design improvement ideas.'
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Sidebar - Inputs */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Boundaries Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg shadow-black/50">
            <h2 className="text-cyan-400 font-semibold mb-4 flex items-center gap-2 text-sm tracking-wider uppercase">
               <Activity size={16}/> Boundary Conditions
            </h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Inner Temp (T_in) °C</label>
                  <input type="number" name="tInner" value={boundaries.tInner} onChange={handleBoundaryChange}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-cyan-500 outline-none transition-colors" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Inner Conv (h_in) W/m²K</label>
                  <input type="number" name="hInner" value={boundaries.hInner} onChange={handleBoundaryChange}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-cyan-500 outline-none transition-colors" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Outer Temp (T_out) °C</label>
                  <input type="number" name="tOuter" value={boundaries.tOuter} onChange={handleBoundaryChange}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-cyan-500 outline-none transition-colors" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Outer Conv (h_out) W/m²K</label>
                  <input type="number" name="hOuter" value={boundaries.hOuter} onChange={handleBoundaryChange}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-cyan-500 outline-none transition-colors" />
                </div>
              </div>
            </div>
          </div>

          {/* Material Layers Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg shadow-black/50">
             <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
               <h2 className="text-cyan-400 font-semibold flex items-center gap-2 text-sm tracking-wider uppercase">
                 <Layers size={16}/> Material Layers
               </h2>
               <button
                 type="button"
                 onClick={addLayer}
                 className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-700/70 bg-slate-950/90 px-3.5 py-2 text-xs text-slate-200 hover:border-cyan-400/30 hover:text-cyan-300 transition-all"
               >
                 <Plus className="w-4 h-4" /> Add Layer
               </button>
             </div>
            
            <div className="space-y-6">
              {layers.map((layer, index) => (
                <div key={layer.id} className="relative p-4 border border-slate-700/50 rounded-lg bg-slate-950/50">
                  <span className="absolute -top-3 left-3 bg-slate-900 px-2 text-xs text-slate-400 font-bold">Layer {index + 1}: {layer.name}</span>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Thickness (m)</label>
                      <input type="number" step="0.01" value={layer.thickness} onChange={(e) => handleLayerChange(layer.id, 'thickness', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Cond. (k) W/m·K</label>
                      <input type="number" step="0.01" value={layer.k} onChange={(e) => handleLayerChange(layer.id, 'k', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm outline-none" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-slate-400 text-xs">
                    <input
                      type="text"
                      value={layer.name}
                      onChange={(e) => handleLayerChange(layer.id, 'name', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm outline-none"
                      placeholder="Layer name"
                    />
                    {layers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLayer(layer.id)}
                        className="inline-flex items-center gap-2 text-rose-300 hover:text-rose-200"
                      >
                        <Trash2 className="w-4 h-4" /> Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4 text-sm text-slate-300">
              <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4">
                <p className="text-slate-500 text-xs uppercase tracking-[0.2em] mb-2">Total thickness</p>
                <p className="text-white text-lg font-semibold">{totalLayerThickness.toFixed(3)} m</p>
              </div>
              <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4">
                <p className="text-slate-500 text-xs uppercase tracking-[0.2em] mb-2">Layer resistance</p>
                <p className="text-white text-lg font-semibold">{totalLayerResistance.toFixed(4)} K/W</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Main Area - Dashboards */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Top Status Bar */}
          <div className="bg-slate-900 border border-emerald-900/50 rounded-xl p-5 flex justify-between items-center shadow-lg shadow-black/50">
             <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total Heat Flux ($q/A$)</p>
                <p className="text-3xl font-bold text-emerald-400">
                  {results ? results.heatFlux.toFixed(2) : '0.00'} <span className="text-sm text-slate-500">W/m²</span>
                </p>
             </div>
             <div className="text-right">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Overall Heat Transfer Coeff ($U$)</p>
                <p className="text-3xl font-bold text-cyan-400">
                  {results ? results.overallU.toFixed(3) : '0.000'} <span className="text-sm text-slate-500">W/m²K</span>
                </p>
             </div>
            <div className="flex items-center gap-3 ml-4">
              <button onClick={exportResults} className="text-xs px-3 py-1 rounded-md bg-slate-800/60 hover:bg-slate-800/80 border border-slate-700 text-slate-200">Export Results</button>
            </div>
          </div>

          {/* Interactive Graph Dashboard */}
          <div className="flex-grow bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg shadow-black/50 flex flex-col">
            <h2 className="text-cyan-400 font-semibold mb-6 flex items-center gap-2 text-sm tracking-wider uppercase">
               <Activity size={16}/> Temperature Gradient Profile T(x)
            </h2>
            
            <div className="flex-grow min-h-[400px]">
              {results && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={results.temperatureProfile} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis 
                      dataKey="x" 
                      type="number" 
                      stroke="#64748b" 
                      tickFormatter={(val) => `${val.toFixed(2)}m`}
                      domain={['dataMin', 'dataMax']}
                    />
                    <YAxis 
                      stroke="#64748b" 
                      tickFormatter={(val) => `${val}°C`}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                      formatter={(value) => [`${value.toFixed(2)} °C`, 'Temperature']}
                      labelFormatter={(label) => `Position: ${Number(label).toFixed(3)} m`}
                    />
                    
                    {/* Background areas to represent material layers */}
                    {chartAreas.map((area, i) => (
                       <ReferenceArea key={i} x1={area.start} x2={area.end} fill={area.color} fillOpacity={0.1} />
                    ))}

                    <Line 
                      type="monotone" 
                      dataKey="temp" 
                      stroke="#f97316" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: '#f97316', strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: '#fff', stroke: '#f97316' }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
            
            {/* Legend generated dynamically */}
            <div className="mt-4 flex gap-4 text-xs justify-center">
               {chartAreas.map((area, i) => (
                  <div key={i} className="flex items-center gap-2">
                     <div className="w-3 h-3 rounded-sm opacity-50" style={{ backgroundColor: area.color }}></div>
                     <span className="text-slate-400">{area.name}</span>
                  </div>
               ))}
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg shadow-black/50">
             <div className="flex items-start gap-3">
                <Info className="text-cyan-500 mt-1" size={20} />
                <div>
                   <p className="text-sm text-slate-300">
                     <strong>Analysis Classification:</strong> {results && results.heatFlux > 1000 ? 'High Heat Flux Environment' : 'Standard Insulative Boundary'}. 
                     The dominant thermal resistance is in 
                     <span className="text-cyan-400 font-semibold ml-1">
                        {results && results.layerResistances.length > 0 
                          ? [...results.layerResistances].sort((a,b) => b.resistance - a.resistance)[0].name 
                          : '...'}
                     </span>.
                   </p>
                </div>
             </div>
            {/* Gemini Advisor */}
            <div className="mt-4 border-t border-slate-800/60 pt-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Bot className="text-cyan-300" />
                  <h4 className="text-sm font-bold text-white">Gemini Thermal Oracle</h4>
                </div>
                <div>
                  <button onClick={fetchAiAnalysis} disabled={aiLoading} className="text-xs px-3 py-1 rounded-md bg-slate-800/60 hover:bg-slate-800/80 border border-slate-700 text-slate-200">
                    {aiLoading ? 'Analyzing...' : 'Evaluate System'}
                  </button>
                </div>
              </div>
              {aiAnalysis && (
                <div className="mt-3 text-slate-300 text-sm whitespace-pre-wrap">
                  {aiAnalysis}
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 mt-6">
            <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-3">Key Terms for Heat Transfer</h3>
            <div className="grid gap-3 text-xs text-slate-300">
              <div><strong>Heat Flux</strong>: Heat transfer rate per unit area (W/m²).</div>
              <div><strong>Overall U-value</strong>: Total thermal conductance of the composite wall (W/m²K).</div>
              <div><strong>Thermal Resistance (R)</strong>: Temperature drop across a layer divided by heat flux.</div>
              <div><strong>Convective Coefficient (h)</strong>: Heat transfer coefficient at a surface between fluid and solid.</div>
              <div><strong>Thermal Conductivity (k)</strong>: Material property that governs conduction rate through a layer.</div>
              <div><strong>Dominant Thermal Resistance</strong>: Layer that contributes most to the total resistance and controls heat flow.</div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}