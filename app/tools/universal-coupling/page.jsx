// app/tools/universal-coupling/page.jsx
'use client';

import React, { useState, useRef, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Grid } from '@react-three/drei';
import { Activity, Settings, RefreshCcw, Info } from 'lucide-react';
import ToolInstructions from '@/app/components/ToolInstructions';
import { generateKinematicData } from '@/lib/universal-coupling';

// --- 3D Components ---

function UniversalJoint3D({ alpha, speed }) {
  const driveRef = useRef();
  const drivenRef = useRef();
  const crossRef = useRef();
  
  const alphaRad = (alpha * Math.PI) / 180;

  useFrame((state, delta) => {
    if (!driveRef.current || !drivenRef.current || !crossRef.current) return;

    const dTheta = (speed * Math.PI / 30) * delta; // rpm to rad/s
    const currentTheta = driveRef.current.rotation.x + dTheta;
    driveRef.current.rotation.x = currentTheta;

    // Correct universal-joint output angle relation: tan θ = cos α · tan φ
    const phi = Math.atan2(
      Math.sin(currentTheta),
      Math.cos(alphaRad) * Math.cos(currentTheta)
    );

    drivenRef.current.rotation.x = phi;

    crossRef.current.rotation.x = currentTheta;
    crossRef.current.rotation.y = alphaRad * 0.5 * Math.sin(currentTheta);
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Drive Shaft (Input) */}
      <group ref={driveRef} position={[-2, 0, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.2, 0.2, 4, 32]} />
          <meshStandardMaterial color="#06b6d4" />
        </mesh>
        <group position={[2.2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[1.1, 0.22, 0.22]} />
            <meshStandardMaterial color="#06b6d4" />
          </mesh>
          <mesh position={[0, 0.38, 0]}>
            <boxGeometry args={[0.22, 0.8, 0.22]} />
            <meshStandardMaterial color="#06b6d4" />
          </mesh>
          <mesh position={[0, -0.38, 0]}>
            <boxGeometry args={[0.22, 0.8, 0.22]} />
            <meshStandardMaterial color="#06b6d4" />
          </mesh>
        </group>
      </group>

      {/* Spider (Cross) */}
      <group ref={crossRef} position={[0, 0, 0]}>
        <mesh>
          <boxGeometry args={[0.2, 0.2, 1.2]} />
          <meshStandardMaterial color="#f59e0b" />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[0.2, 0.2, 1.2]} />
          <meshStandardMaterial color="#f59e0b" />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <boxGeometry args={[0.35, 0.35, 0.35]} />
          <meshStandardMaterial color="#f59e0b" />
        </mesh>
      </group>

      {/* Driven Shaft (Output) angled by Alpha */}
      <group rotation={[0, alphaRad, 0]}>
        <group ref={drivenRef} position={[2, 0, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.2, 0.2, 4, 32]} />
            <meshStandardMaterial color="#8b5cf6" />
          </mesh>
          <group position={[-2.2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[0.22, 1.1, 0.22]} />
              <meshStandardMaterial color="#8b5cf6" />
            </mesh>
            <mesh position={[0, 0.5, 0]}>
              <boxGeometry args={[0.22, 0.22, 0.75]} />
              <meshStandardMaterial color="#8b5cf6" />
            </mesh>
            <mesh position={[0, -0.5, 0]}>
              <boxGeometry args={[0.22, 0.22, 0.75]} />
              <meshStandardMaterial color="#8b5cf6" />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}

// --- Main Page Component ---

export default function UniversalCouplingViewer() {
  const [alpha, setAlpha] = useState(30); // degrees
  const [inputRPM, setInputRPM] = useState(100);

  // Generate chart data based on current parameters
  const chartData = useMemo(() => generateKinematicData(inputRPM, alpha), [inputRPM, alpha]);
  
  // Calculate max/min fluctuation for the dashboard stats
  const maxOutput = Math.max(...chartData.map(d => d.omega2));
  const minOutput = Math.min(...chartData.map(d => d.omega2));
  const fluctuation = maxOutput - minOutput;

  return (
    <div className="min-h-screen bg-[#0a0f1c] text-slate-300 p-6 font-sans">
      
      {/* Header */}
      <header className="mb-6 border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Activity className="text-purple-500" />
          Cardan Motion Forge
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Spin the universal joint, watch the output wobble, and explore the velocity waveform live.
        </p>
      </header>

      <ToolInstructions
        title="Universal Coupling"
        subtitle="Animate a Cardan joint, inspect the driven speed ripple, and decode the kinematic phase relationship."
        quick="1. Set angle · 2. Spin the input · 3. Watch the waveform"
        steps={[
          'Set the intersection angle and input RPM to configure the joint.',
          'Follow the ω₂ waveform to see how the output speed changes per revolution.',
          'Review the key terms to understand what drives velocity fluctuation.'
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Sidebar: Controls */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 shadow-lg">
            <h2 className="text-xs font-bold text-slate-400 tracking-wider mb-4 flex items-center gap-2">
              <Settings size={16} /> SETUP PARAMETERS
            </h2>
            
            <div className="space-y-6">
              {/* Alpha Angle Input */}
              <div>
                <label className="flex justify-between text-sm mb-2">
                  <span>Intersection Angle (α)</span>
                  <span className="text-cyan-400 font-mono">{alpha}°</span>
                </label>
                <input 
                  type="range" 
                  min="0" max="45" step="1"
                  value={alpha}
                  onChange={(e) => setAlpha(Number(e.target.value))}
                  className="w-full accent-cyan-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-slate-600 mt-1">
                  <span>0°</span>
                  <span>45°</span>
                </div>
              </div>

              {/* Input RPM */}
              <div>
                <label className="flex justify-between text-sm mb-2">
                  <span>Drive Shaft Speed (ω₁)</span>
                  <span className="text-cyan-400 font-mono">{inputRPM} RPM</span>
                </label>
                <input 
                  type="range" 
                  min="10" max="500" step="10"
                  value={inputRPM}
                  onChange={(e) => setInputRPM(Number(e.target.value))}
                  className="w-full accent-cyan-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Quick Stats Panel */}
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 shadow-lg">
            <h2 className="text-xs font-bold text-slate-400 tracking-wider mb-4 flex items-center gap-2">
              <Info size={16} /> Kinematic Pulse Metrics
            </h2>
            <div className="space-y-4">
              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                <span className="text-xs text-slate-500">Max Output Speed</span>
                <div className="text-lg font-bold text-purple-400">{maxOutput.toFixed(1)} RPM</div>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                <span className="text-xs text-slate-500">Min Output Speed</span>
                <div className="text-lg font-bold text-amber-500">{minOutput.toFixed(1)} RPM</div>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                <span className="text-xs text-slate-500">Speed Fluctuation (Δω)</span>
                <div className="text-lg font-bold text-red-400">{fluctuation.toFixed(1)} RPM</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          
          {/* Top: 3D Viewer */}
          <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden shadow-lg h-[400px] relative">
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-700 backdrop-blur-sm text-xs text-cyan-400">
              <RefreshCcw size={14} className="animate-spin" />
              Live Motion Forge
            </div>
            
            <Canvas camera={{ position: [0, 5, 8], fov: 45 }}>
              <color attach="background" args={['#0a0f1c']} />
              <ambientLight intensity={0.5} />
              <directionalLight position={[10, 10, 10]} intensity={1} />
              <Environment preset="city" />
              <UniversalJoint3D alpha={alpha} speed={inputRPM} />
              <Grid infiniteGrid fadeDistance={20} sectionColor="#1e293b" cellColor="#0f172a" />
              <OrbitControls makeDefault />
            </Canvas>
          </div>

          {/* Bottom: Charts */}
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 shadow-lg flex-grow">
            <h2 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
              <Activity size={16} className="text-purple-400" />
              Velocity Ratio Profile: ω₂ vs θ₁
            </h2>
            
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis 
                    dataKey="theta" 
                    stroke="#64748b" 
                    tick={{fill: '#64748b', fontSize: 12}}
                    label={{ value: 'Drive Shaft Angle θ (degrees)', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="#64748b" 
                    tick={{fill: '#64748b', fontSize: 12}}
                    domain={['auto', 'auto']}
                    label={{ value: 'Angular Velocity (RPM)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Line 
                    type="monotone" 
                    dataKey="omega1" 
                    name="Drive Shaft (ω₁)" 
                    stroke="#06b6d4" 
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="omega2" 
                    name="Driven Shaft (ω₂)" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    dot={false} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-4 bg-slate-900/50 rounded-lg p-4 border border-slate-800 text-sm text-slate-400">
              <p>
                <strong>Governing Equation:</strong> ω₂ = (ω₁ · cos α) / (1 - sin² α · cos² θ)
              </p>
              <p className="mt-2 text-xs">
                As the intersection angle (α) increases, the fluctuation in the driven shaft velocity (ω₂) becomes significantly more pronounced, leading to higher dynamic stresses in the system.
              </p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 mt-6">
              <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-3">Key Terms for Universal Coupling</h3>
              <div className="grid gap-3 text-xs text-slate-300">
                <div><strong>Intersection Angle (α)</strong>: The angle between the drive and driven shaft centerlines.</div>
                <div><strong>Drive Speed (ω₁)</strong>: Rotational speed of the input shaft.</div>
                <div><strong>Driven Speed (ω₂)</strong>: Instantaneous rotational speed of the output shaft.</div>
                <div><strong>Velocity Fluctuation (Δω)</strong>: Difference between the maximum and minimum ω₂ values during one input revolution.</div>
                <div><strong>Cardan Joint</strong>: A universal joint that transmits rotation between non-collinear shafts.</div>
                <div><strong>Phase Relation</strong>: The angular relationship between input and output shaft rotation through the joint.</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}