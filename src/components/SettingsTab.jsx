import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Settings, Store, RotateCcw, 
  ExternalLink, Check, Volume2, ShieldCheck, FileText, CheckCircle2, Layers
} from 'lucide-react';
import { playNotificationSound, generateDemoOrder } from '../services/storageService';

export default function SettingsTab({ onOrderCreated }) {
  const [defaultPrintType, setDefaultPrintType] = useState('B&W');
  const [defaultSides, setDefaultSides] = useState('single');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [demoOrderSuccess, setDemoOrderSuccess] = useState(false);

  const testAudio = (type) => {
    playNotificationSound(type);
  };

  const handleCreateTestOrder = () => {
    const order = generateDemoOrder('SHARMA-01');
    setDemoOrderSuccess(true);
    if (onOrderCreated) onOrderCreated(order);
    setTimeout(() => setDemoOrderSuccess(false), 2500);
  };

  const handleResetData = () => {
    if (window.confirm('Reset all demo orders and restore default shops?')) {
      localStorage.removeItem('softpaper_orders');
      localStorage.removeItem('softpaper_shops');
      setResetSuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 700);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">Settings & Preferences</h2>
        <p className="text-xs text-slate-400 font-medium">Control app audio, default printing options & system controls</p>
      </div>

      {resetSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4" /> Reset completed! Reloading system...
        </div>
      )}

      {demoOrderSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in zoom-in-95">
          <CheckCircle2 className="w-4 h-4" /> Test Print Order injected! Check your Orders tab or Shop console.
        </div>
      )}

      {/* Preferences Card */}
      <div className="bg-[#0A111E] border border-white/5 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-md">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Printing & Audio Preferences</h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Audio Chime Testing */}
          <div className="bg-[#040812] p-3.5 rounded-xl border border-white/5 flex flex-col justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Synthesized Audio Chimes</p>
                <p className="text-[10px] text-slate-400">Pure Web Audio API chime sounds</p>
              </div>
            </div>
            <div className="flex gap-1.5 pt-1">
              <button
                onClick={() => testAudio('new_order')}
                className="flex-1 text-[10px] bg-[#111A2C] hover:bg-[#1A263D] text-slate-300 py-1.5 px-2 rounded-lg border border-white/5 font-bold transition-colors"
              >
                Chime
              </button>
              <button
                onClick={() => testAudio('status_update')}
                className="flex-1 text-[10px] bg-[#111A2C] hover:bg-[#1A263D] text-slate-300 py-1.5 px-2 rounded-lg border border-white/5 font-bold transition-colors"
              >
                Ping
              </button>
              <button
                onClick={() => testAudio('shred')}
                className="flex-1 text-[10px] bg-[#111A2C] hover:bg-[#1A263D] text-emerald-400 py-1.5 px-2 rounded-lg border border-white/5 font-bold transition-colors"
              >
                Shred
              </button>
            </div>
          </div>

          {/* Default Print Mode */}
          <div className="bg-[#040812] p-3.5 rounded-xl border border-white/5 flex flex-col justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <Settings className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Default Print Format</p>
                <p className="text-[10px] text-slate-400">Preset color selection</p>
              </div>
            </div>
            <div className="flex bg-[#111A2C] p-1 rounded-xl border border-white/5">
              <button
                onClick={() => setDefaultPrintType('B&W')}
                className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  defaultPrintType === 'B&W' ? 'bg-slate-200 text-black shadow-sm font-black' : 'text-slate-400'
                }`}
              >
                Monochrome (B&W)
              </button>
              <button
                onClick={() => setDefaultPrintType('Color')}
                className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  defaultPrintType === 'Color' ? 'bg-blue-500 text-white shadow-sm font-black' : 'text-slate-400'
                }`}
              >
                Color
              </button>
            </div>
          </div>

          {/* Default Sides Setting */}
          <div className="bg-[#040812] p-3.5 rounded-xl border border-white/5 flex flex-col justify-between gap-2.5 sm:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Default Page Sides</p>
                <p className="text-[10px] text-slate-400">Single-sided or paper-saving duplex</p>
              </div>
            </div>
            <div className="flex bg-[#111A2C] p-1 rounded-xl border border-white/5">
              <button
                onClick={() => setDefaultSides('single')}
                className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  defaultSides === 'single' ? 'bg-slate-200 text-black shadow-sm font-black' : 'text-slate-400'
                }`}
              >
                Single Sided
              </button>
              <button
                onClick={() => setDefaultSides('double')}
                className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  defaultSides === 'double' ? 'bg-emerald-500 text-[#040812] shadow-sm font-black' : 'text-slate-400'
                }`}
              >
                Front & Back (Duplex)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Developer & Test Pipeline Utilities */}
      <div className="bg-[#0A111E] border border-white/5 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-md">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Fast Testing & Demo Utilities</h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Quick Test Order Button */}
          <div className="bg-[#040812] p-3.5 rounded-xl border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Generate Test Order</p>
                <p className="text-[10px] text-slate-400">Simulate incoming order in 1-click</p>
              </div>
            </div>
            <button
              onClick={handleCreateTestOrder}
              className="bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-xl font-bold text-xs active:scale-95 transition-all shadow-sm"
            >
              + Test Order
            </button>
          </div>

          {/* Reset Demo Data */}
          <div className="bg-[#040812] p-3.5 rounded-xl border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Reset Demo Storage</p>
                <p className="text-[10px] text-slate-400">Restore factory shops & mock orders</p>
              </div>
            </div>
            <button
              onClick={handleResetData}
              className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 px-3 py-1.5 rounded-xl font-bold text-xs active:scale-95 transition-all"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Switch to Shopkeeper Console */}
      <div className="bg-gradient-to-r from-orange-500/15 via-[#0A111E] to-amber-500/10 border border-orange-500/30 rounded-2xl p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-orange-500/20 text-orange-400 rounded-xl border border-orange-500/30">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-black text-white">Shopkeeper Terminal Console</p>
            <p className="text-xs text-orange-300/80 mt-0.5">Manage incoming student queue, print studio & auto-shredding</p>
          </div>
        </div>
        <Link
          to="/shop"
          className="bg-orange-500 hover:bg-orange-400 text-[#040812] px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition-all shrink-0"
        >
          <span>Open Console</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Security Protocol Badge Footer */}
      <div className="p-3 bg-[#0A111E]/50 border border-white/5 rounded-2xl flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>SoftPaper Zero-Trace Protocol 2.0 • In-Memory Browser Execution</span>
        </div>
        <span className="text-[10px] text-emerald-400/80 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md">
          v2.0 PRO
        </span>
      </div>
    </div>
  );
}
