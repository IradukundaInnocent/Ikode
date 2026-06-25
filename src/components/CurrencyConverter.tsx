import React, { useState, useEffect } from "react";
import { Calculator, ArrowRight, RefreshCw, X } from "lucide-react";
import { CURRENCY_CONFIGS, CurrencyCode } from "../utils/currency";

export default function CurrencyConverter() {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState<string>("100000");
  const [fromCurrency, setFromCurrency] = useState<CurrencyCode>("FRW");

  // Calculate conversions based on input and exchange rates
  const calculateConversions = () => {
    const numAmount = parseFloat(amount.replace(/,/g, "")) || 0;
    
    // First, convert the input amount to FRW
    const fromConfig = CURRENCY_CONFIGS[fromCurrency];
    const amountInFRW = numAmount / fromConfig.rate;

    // Then, convert from FRW to all other currencies
    return (Object.keys(CURRENCY_CONFIGS) as CurrencyCode[]).map((code) => {
      const config = CURRENCY_CONFIGS[code];
      const convertedValue = amountInFRW * config.rate;
      return {
        code,
        label: config.label,
        symbol: config.symbol,
        suffix: config.suffix,
        value: convertedValue,
      };
    });
  };

  const conversions = calculateConversions();

  return (
    <div className="relative inline-block text-left" id="currency-converter-widget">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 cursor-pointer transition-colors"
        title="Open interactive Currency Converter calculator"
        type="button"
      >
        <Calculator className="w-3.5 h-3.5 text-indigo-600" />
        <span>Currency Converter</span>
      </button>

      {/* Popover Card */}
      {isOpen && (
        <>
          {/* Backdrop for close on click outside */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-slate-200/90 shadow-xl z-50 p-4 space-y-4 animate-fade-in text-left">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-indigo-600 animate-bounce-slow" />
                <h4 className="text-xs font-black text-slate-900 tracking-tight uppercase">Live Exchange Calculator</h4>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                type="button"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Input Form */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Enter Amount</label>
              <div className="flex rounded-xl overflow-hidden border border-slate-200 shadow-inner bg-slate-50/50">
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => {
                    const val = e.target.value;
                    // Only allow numbers and decimal point
                    if (/^[0-9.]*$/.test(val)) {
                      setAmount(val);
                    }
                  }}
                  placeholder="e.g. 150000"
                  className="flex-1 px-3 py-2.5 bg-transparent outline-none text-sm font-bold text-slate-800 placeholder-slate-400 font-mono"
                />
                <select
                  value={fromCurrency}
                  onChange={(e) => setFromCurrency(e.target.value as CurrencyCode)}
                  className="bg-slate-100/80 hover:bg-slate-100 border-l border-slate-200 px-3 py-2.5 text-xs font-extrabold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="FRW">RWF</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
            </div>

            {/* Conversion Outputs */}
            <div className="space-y-2 bg-slate-50/60 p-3 rounded-xl border border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Converted Balances</span>
                <span className="text-[9px] text-indigo-600 lowercase font-normal flex items-center gap-0.5 font-mono">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin-slow" /> base: FRW (Rwandan Franc)
                </span>
              </div>
              
              <div className="space-y-2">
                {conversions.map((conv) => {
                  const isSource = conv.code === fromCurrency;
                  return (
                    <div 
                      key={conv.code} 
                      className={`flex justify-between items-center py-1.5 px-2 rounded-lg transition-colors ${
                        isSource ? "bg-indigo-50/30 border border-indigo-100/50" : "hover:bg-slate-100/40"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${
                          conv.code === "FRW" ? "bg-emerald-500" :
                          conv.code === "USD" ? "bg-indigo-500" :
                          conv.code === "EUR" ? "bg-amber-500" : "bg-purple-500"
                        }`} />
                        <span className="text-[11px] font-extrabold text-slate-750 font-mono">{conv.code}</span>
                      </div>
                      
                      <span className={`text-xs font-mono font-bold ${
                        isSource ? "text-indigo-600" : "text-slate-800"
                      }`}>
                        {conv.symbol}
                        {conv.value.toLocaleString(undefined, {
                          minimumFractionDigits: conv.code === "FRW" ? 0 : 2,
                          maximumFractionDigits: conv.code === "FRW" ? 0 : 2
                        })}
                        {conv.suffix}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
