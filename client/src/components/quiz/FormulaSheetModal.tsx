import React, { useState } from 'react';
import { X, Search, BookOpen, Sparkles, Hash, Zap } from 'lucide-react';
import MathRenderer from '../math/MathRenderer';

interface FormulaSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormulaItem {
  id: string;
  category: string;
  name: string;
  latex: string;
  description: string;
}

const FORMULA_DATABASE: FormulaItem[] = [
  // Ohm's Law & Power
  {
    id: 'ohm-law',
    category: 'Ohm & Power',
    name: "Ohm's Law",
    latex: 'V = I \\cdot R \\quad \\iff \\quad I = \\frac{V}{R} \\quad \\iff \\quad R = \\frac{V}{I}',
    description: 'Relates Voltage (V), Current (I in Amperes), and Resistance (R in Ohms).',
  },
  {
    id: 'power-eq',
    category: 'Ohm & Power',
    name: 'Electric Power',
    latex: 'P = V \\cdot I = I^2 \\cdot R = \\frac{V^2}{R}',
    description: 'Power dissipated in Watts (W).',
  },
  {
    id: 'conductance',
    category: 'Ohm & Power',
    name: 'Conductance',
    latex: 'G = \\frac{1}{R} \\quad (\\text{Siemens, } S)',
    description: 'Reciprocal of electrical resistance.',
  },

  // R, L, C Circuits
  {
    id: 'res-series',
    category: 'R, L, C',
    name: 'Resistors in Series',
    latex: 'R_{total} = R_1 + R_2 + R_3 + \\dots + R_n',
    description: 'Current is identical through each series resistor.',
  },
  {
    id: 'res-parallel',
    category: 'R, L, C',
    name: 'Resistors in Parallel',
    latex: '\\frac{1}{R_{total}} = \\frac{1}{R_1} + \\frac{1}{R_2} + \\dots \\quad \\text{Two resistors: } R_{total} = \\frac{R_1 R_2}{R_1 + R_2}',
    description: 'Voltage is identical across each parallel branch.',
  },
  {
    id: 'cap-parallel',
    category: 'R, L, C',
    name: 'Capacitors in Parallel',
    latex: 'C_{total} = C_1 + C_2 + C_3 + \\dots',
    description: 'Capacitors in parallel add directly like series resistors.',
  },
  {
    id: 'cap-series',
    category: 'R, L, C',
    name: 'Capacitors in Series',
    latex: '\\frac{1}{C_{total}} = \\frac{1}{C_1} + \\frac{1}{C_2} + \\dots \\quad \\text{Two: } C_{total} = \\frac{C_1 C_2}{C_1 + C_2}',
    description: 'Series capacitors follow the reciprocal sum rule.',
  },
  {
    id: 'ind-series-parallel',
    category: 'R, L, C',
    name: 'Inductors (Series & Parallel)',
    latex: 'L_{series} = L_1 + L_2 + \\dots \\qquad L_{parallel} = \\frac{L_1 L_2}{L_1 + L_2}',
    description: 'Inductors combine identically to resistors.',
  },

  // AC & Reactance
  {
    id: 'ind-reactance',
    category: 'AC & Frequency',
    name: 'Inductive Reactance',
    latex: 'X_L = 2\\pi f L = \\omega L \\quad (\\Omega)',
    description: 'Opposes AC current; increases proportionally with frequency.',
  },
  {
    id: 'cap-reactance',
    category: 'AC & Frequency',
    name: 'Capacitive Reactance',
    latex: 'X_C = \\frac{1}{2\\pi f C} = \\frac{1}{\\omega C} \\quad (\\Omega)',
    description: 'Opposes AC current; decreases as frequency increases.',
  },
  {
    id: 'resonance',
    category: 'AC & Frequency',
    name: 'Resonant Frequency',
    latex: 'f_r = \\frac{1}{2\\pi\\sqrt{L C}}',
    description: 'Occurs when Inductive Reactance equals Capacitive Reactance (XL = XC).',
  },
  {
    id: 'rc-cutoff',
    category: 'AC & Frequency',
    name: 'RC Filter Cutoff Frequency (-3dB)',
    latex: 'f_c = \\frac{1}{2\\pi R C} \\qquad \\tau = R \\cdot C \\quad (\\text{Time Constant})',
    description: 'Cutoff frequency where output power drops to 50% (-3dB).',
  },
  {
    id: 'decibel-p',
    category: 'AC & Frequency',
    name: 'Decibel (Power Gain)',
    latex: 'dB = 10 \\log_{10}\\left(\\frac{P_{out}}{P_{in}}\\right)',
    description: 'Logarithmic ratio of output power to input power.',
  },
  {
    id: 'decibel-v',
    category: 'AC & Frequency',
    name: 'Decibel (Voltage / Current Gain)',
    latex: 'dB = 20 \\log_{10}\\left(\\frac{V_{out}}{V_{in}}\\right) = 20 \\log_{10}\\left(\\frac{I_{out}}{I_{in}}\\right)',
    description: 'Voltage gain formula across matched impedances.',
  },

  // Semiconductors & Op-Amps
  {
    id: 'bjt-currents',
    category: 'Semiconductors & Op-Amps',
    name: 'BJT Current Relationships',
    latex: 'I_E = I_B + I_C \\qquad I_C = \\beta \\cdot I_B \\qquad \\alpha = \\frac{\\beta}{\\beta + 1}',
    description: 'Base (IB), Collector (IC), and Emitter (IE) transistor currents.',
  },
  {
    id: 'inverting-opamp',
    category: 'Semiconductors & Op-Amps',
    name: 'Inverting Operational Amplifier Gain',
    latex: 'A_v = -\\frac{R_f}{R_{in}} \\qquad V_{out} = -\\left(\\frac{R_f}{R_{in}}\\right) V_{in}',
    description: 'Closed-loop voltage gain with 180° phase inversion.',
  },
  {
    id: 'non-inverting-opamp',
    category: 'Semiconductors & Op-Amps',
    name: 'Non-Inverting Op-Amp Gain',
    latex: 'A_v = 1 + \\frac{R_f}{R_{in}} \\qquad V_{out} = \\left(1 + \\frac{R_f}{R_{in}}\\right) V_{in}',
    description: 'In-phase output voltage gain.',
  },
  {
    id: 'voltage-follower',
    category: 'Semiconductors & Op-Amps',
    name: 'Voltage Follower (Buffer)',
    latex: 'A_v = 1 \\qquad V_{out} = V_{in}',
    description: 'High input impedance, low output impedance buffer.',
  },
];

const RESISTOR_COLORS = [
  { color: 'Black', digit: '0', mult: '×1', bg: '#000000', text: '#ffffff' },
  { color: 'Brown', digit: '1', mult: '×10', bg: '#854d0e', text: '#ffffff' },
  { color: 'Red', digit: '2', mult: '×100', bg: '#dc2626', text: '#ffffff' },
  { color: 'Orange', digit: '3', mult: '×1k', bg: '#ea580c', text: '#ffffff' },
  { color: 'Yellow', digit: '4', mult: '×10k', bg: '#ca8a04', text: '#000000' },
  { color: 'Green', digit: '5', mult: '×100k', bg: '#16a34a', text: '#ffffff' },
  { color: 'Blue', digit: '6', mult: '×1M', bg: '#2563eb', text: '#ffffff' },
  { color: 'Violet', digit: '7', mult: '×10M', bg: '#7c3aed', text: '#ffffff' },
  { color: 'Gray', digit: '8', mult: '×100M', bg: '#64748b', text: '#ffffff' },
  { color: 'White', digit: '9', mult: '×1G', bg: '#ffffff', text: '#000000', border: true },
  { color: 'Gold', digit: '±5%', mult: '×0.1', bg: '#eab308', text: '#000000' },
  { color: 'Silver', digit: '±10%', mult: '×0.01', bg: '#94a3b8', text: '#000000' },
];

export default function FormulaSheetModal({ isOpen, onClose }: FormulaSheetModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [search, setSearch] = useState<string>('');

  if (!isOpen) return null;

  const categories = ['All', 'Ohm & Power', 'R, L, C', 'AC & Frequency', 'Semiconductors & Op-Amps', 'Resistor Colors'];

  const filteredFormulas = FORMULA_DATABASE.filter((item) => {
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[88vh] flex flex-col bg-card border border-border rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border bg-bg-secondary/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-text-primary tracking-tight">
                Electronics Quick Reference & Formula Sheet
              </h2>
              <p className="text-xs text-text-secondary">
                Essential ECT Board Exam equations and standards
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-card transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="p-4 border-b border-border bg-card space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-text-secondary absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search formula (e.g. cutoff, gain, parallel, reactance)..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-bg-secondary border border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-semibold transition ${
                  selectedCategory === cat
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Resistor Color Codes Visual Table */}
          {(selectedCategory === 'All' || selectedCategory === 'Resistor Colors') && (
            <div className="bg-bg-secondary/60 border border-border rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Hash className="w-4 h-4 text-primary" /> Resistor Color Code Decoder (BBROYGBVGW)
                </h3>
                <span className="text-[11px] text-text-secondary font-medium">
                  "Bad Boys Rape Our Young Girls But Violet Gives Willingly"
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {RESISTOR_COLORS.map((rc) => (
                  <div
                    key={rc.color}
                    className="p-2.5 rounded-xl border border-border flex items-center gap-2.5 bg-card"
                  >
                    <span
                      style={{
                        backgroundColor: rc.bg,
                        border: rc.border ? '1px solid #cbd5e1' : 'none',
                      }}
                      className="w-4 h-4 rounded-full shrink-0 shadow-xs"
                    />
                    <div>
                      <div className="text-xs font-bold text-text-primary leading-tight">
                        {rc.color}
                      </div>
                      <div className="text-[10px] text-text-secondary">
                        {rc.digit} ({rc.mult})
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Formula Cards */}
          {selectedCategory !== 'Resistor Colors' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredFormulas.map((item) => (
                <div
                  key={item.id}
                  className="bg-card border border-border rounded-2xl p-4 shadow-xs hover:border-primary/40 transition flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-bold text-text-primary">{item.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                        {item.category}
                      </span>
                    </div>

                    <p className="text-[11px] text-text-secondary leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* MathRenderer for Beautiful LaTeX Rendering */}
                  <div className="p-3 rounded-xl bg-bg-secondary/80 border border-border flex items-center justify-center overflow-x-auto">
                    <MathRenderer content={`$$${item.latex}$$`} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-border bg-bg-secondary/40 flex items-center justify-between text-xs text-text-secondary">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            Formula memorization is key to ECT speed & accuracy
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary-hover transition"
          >
            Close Sheet
          </button>
        </div>
      </div>
    </div>
  );
}
