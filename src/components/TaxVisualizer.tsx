import React, { useState } from "react";
import { Calculator, ArrowRight, Info, AlertCircle } from "lucide-react";

export function TaxVisualizer() {
  const [baseAmount, setBaseAmount] = useState<number>(1000);

  // Pre-2026 Cascading Logic (Act 870)
  const legacyNhil = baseAmount * 0.025;
  const legacyGetfund = baseAmount * 0.025;
  const legacySubtotal = baseAmount + legacyNhil + legacyGetfund;
  const legacyVat = legacySubtotal * 0.15;
  const legacyTotal = legacySubtotal + legacyVat;
  const legacyEffectiveRate = ((legacyTotal - baseAmount) / baseAmount) * 100;

  // Post-2026 Flat Logic (Act 1151)
  const newNhil = baseAmount * 0.025;
  const newGetfund = baseAmount * 0.025;
  const newVat = baseAmount * 0.15;
  const newTotal = baseAmount + newNhil + newGetfund + newVat;
  const newEffectiveRate = ((newTotal - baseAmount) / baseAmount) * 100;

  return (
    <div className="h-full flex flex-col bg-zinc-950 p-8 gap-8 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-3">
          <Calculator size={28} className="text-emerald-500" />
          Tax Computation Visualizer
        </h2>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-lg">
        <label className="block text-sm font-medium text-zinc-400 mb-2">Base Transaction Value (GH¢)</label>
        <div className="flex items-center gap-4">
          <input
            type="number"
            value={baseAmount}
            onChange={(e) => setBaseAmount(Number(e.target.value))}
            className="w-64 bg-zinc-950 border border-zinc-700 text-zinc-100 text-xl font-mono px-4 py-3 rounded-lg focus:outline-none focus:border-emerald-500"
          />
          <div className="flex items-center gap-2 text-amber-400 bg-amber-500/10 px-4 py-2 rounded-lg text-sm">
            <AlertCircle size={16} />
            Notice: Act 1151 removes cascading tax logic effective Jan 2026.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Legacy System */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-lg flex flex-col">
          <div className="bg-zinc-800/50 px-6 py-4 border-b border-zinc-800">
            <h3 className="text-lg font-semibold text-zinc-300">Pre-2026 (Act 870)</h3>
            <p className="text-xs text-zinc-500 mt-1">Cascading Tax Logic</p>
          </div>
          <div className="p-6 flex-1 flex flex-col gap-4 font-mono text-sm">
            <div className="flex justify-between text-zinc-400">
              <span>Base Amount</span>
              <span>{baseAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-red-400">
              <span>+ NHIL (2.5%)</span>
              <span>{legacyNhil.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-red-400">
              <span>+ GETFund (2.5%)</span>
              <span>{legacyGetfund.toFixed(2)}</span>
            </div>
            <div className="border-t border-zinc-800 pt-2 flex justify-between font-bold text-zinc-300">
              <span>Subtotal (Base + Levies)</span>
              <span>{legacySubtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-red-400">
              <span>+ VAT (15% of Subtotal)</span>
              <span>{legacyVat.toFixed(2)}</span>
            </div>
            <div className="border-t-2 border-zinc-700 pt-4 mt-2 flex justify-between text-xl font-bold text-white">
              <span>Total Payable</span>
              <span>{legacyTotal.toFixed(2)}</span>
            </div>
            <div className="mt-auto pt-6 flex justify-between items-center text-zinc-500">
              <span className="flex items-center gap-1"><Info size={14}/> Effective Rate</span>
              <span className="text-lg font-bold text-red-400">{legacyEffectiveRate.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* New System */}
        <div className="bg-zinc-900 border border-emerald-500/30 rounded-xl overflow-hidden shadow-lg flex flex-col relative">
          <div className="absolute top-0 right-0 bg-emerald-500 text-zinc-950 text-xs font-bold px-3 py-1 rounded-bl-lg">ACTIVE</div>
          <div className="bg-emerald-900/20 px-6 py-4 border-b border-emerald-500/20">
            <h3 className="text-lg font-semibold text-emerald-400">Post-2026 (Act 1151)</h3>
            <p className="text-xs text-emerald-500/70 mt-1">Flat Rate Logic</p>
          </div>
          <div className="p-6 flex-1 flex flex-col gap-4 font-mono text-sm">
            <div className="flex justify-between text-zinc-400">
              <span>Base Amount</span>
              <span>{baseAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-emerald-400">
              <span>+ NHIL (2.5% of Base)</span>
              <span>{newNhil.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-emerald-400">
              <span>+ GETFund (2.5% of Base)</span>
              <span>{newGetfund.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-emerald-400">
              <span>+ VAT (15% of Base)</span>
              <span>{newVat.toFixed(2)}</span>
            </div>
            <div className="border-t-2 border-emerald-500/30 pt-4 mt-8 flex justify-between text-xl font-bold text-white">
              <span>Total Payable</span>
              <span>{newTotal.toFixed(2)}</span>
            </div>
            <div className="mt-auto pt-6 flex justify-between items-center text-zinc-500">
              <span className="flex items-center gap-1"><Info size={14}/> Effective Rate</span>
              <span className="text-lg font-bold text-emerald-400">{newEffectiveRate.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-lg flex items-start gap-4">
        <div className="bg-blue-500/20 p-3 rounded-full text-blue-400 shrink-0">
          <ArrowRight size={24} />
        </div>
        <div>
          <h4 className="text-lg font-semibold text-zinc-200 mb-2">Architectural Impact for ERP Integrators</h4>
          <p className="text-sm text-zinc-400 leading-relaxed">
            The shift from Act 870 to Act 1151 requires a fundamental rewrite of tax computation engines within legacy ERPs (SAP, Oracle, Dynamics). Systems hardcoded to calculate VAT on top of a subtotal that includes NHIL and GETFund will over-calculate tax liability by 1.9%, resulting in API payload rejection by the GRA Certified Invoicing System (CIS) due to mathematical mismatch.
          </p>
        </div>
      </div>
    </div>
  );
}
