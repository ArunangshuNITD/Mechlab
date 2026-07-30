"use client";

import React from "react";

export default function ToolInstructions({ title, subtitle, quick, steps = [] }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg shadow-black/40 mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-cyan-300 font-semibold uppercase tracking-wider text-sm">How to use — {title}</h2>
          {subtitle && (
            <p className="text-slate-400 mt-3 text-sm leading-relaxed max-w-3xl">{subtitle}</p>
          )}
        </div>
        {quick && (
          <div className="text-slate-400 text-xs bg-slate-950/80 border border-slate-800 rounded-full px-3 py-2">
            {quick}
          </div>
        )}
      </div>
      {steps.length > 0 && (
        <ol className="mt-4 space-y-2 text-slate-300 text-sm list-decimal list-inside">
          {steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      )}
    </div>
  );
}
