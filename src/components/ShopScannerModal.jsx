import { useState } from 'react';
import { X, QrCode, Store, Keyboard, AlertCircle, Sparkles } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';

export default function ShopScannerModal({ shops, onSelectShop, onClose }) {
  const [cameraError, setCameraError] = useState(false);
  const [manualCode, setManualCode] = useState('');

  const handleScan = (result) => {
    if (!result) return;
    const scannedRaw = Array.isArray(result) ? result[0].rawValue : result;
    if (scannedRaw) {
      // Find matching shop by id or name
      const matched = shops.find(
        (s) => s.id?.toLowerCase() === scannedRaw.toLowerCase() || s.name?.toLowerCase().includes(scannedRaw.toLowerCase())
      );
      if (matched) {
        onSelectShop(matched);
      } else {
        onSelectShop({
          id: 'SCANNED',
          name: scannedRaw,
          isOpen: true,
          rating: 'New',
          timings: 'Open Now',
          bwPrice: 2,
          colorPrice: 10
        });
      }
      onClose();
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    const matched = shops.find(
      (s) => s.id?.toLowerCase() === manualCode.trim().toLowerCase() || s.name?.toLowerCase().includes(manualCode.trim().toLowerCase())
    );
    if (matched) {
      onSelectShop(matched);
    } else {
      onSelectShop({
        id: manualCode.toUpperCase(),
        name: `Shop (${manualCode.toUpperCase()})`,
        isOpen: true,
        rating: '4.5',
        timings: 'Open Now',
        bwPrice: 2,
        colorPrice: 10
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[115] bg-[#02050A]/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex justify-between items-center z-20">
        <div>
          <p className="text-white font-extrabold text-lg flex items-center gap-2">
            <QrCode className="w-5 h-5 text-emerald-400" />
            <span>Scan Shop QR</span>
          </p>
          <p className="text-emerald-400 text-xs">Align QR inside frame or pick shop</p>
        </div>
        <button
          onClick={onClose}
          className="text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full backdrop-blur-md transition-all active:scale-90"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Scanner or Fallback */}
      <div className="flex-1 flex flex-col items-center justify-center my-4 relative">
        {!cameraError ? (
          <div className="w-full max-w-xs aspect-square rounded-[2rem] overflow-hidden border-2 border-emerald-500/40 relative shadow-[0_0_40px_rgba(16,185,129,0.15)] bg-black">
            <div className="absolute inset-0 border-4 border-emerald-500/80 rounded-[2rem] z-10 pointer-events-none animate-pulse"></div>
            <Scanner
              onScan={handleScan}
              onError={(err) => {
                console.warn('QR Scanner Camera error:', err);
                setCameraError(true);
              }}
            />
          </div>
        ) : (
          <div className="bg-[#0A111E] border border-white/10 rounded-[2rem] p-6 max-w-sm text-center">
            <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-2" />
            <h4 className="text-white font-bold text-sm">Camera Unavailable</h4>
            <p className="text-slate-400 text-xs mt-1">
              Select any nearby shop below or enter the shop code directly!
            </p>
          </div>
        )}

        {/* Manual Code Input Form */}
        <form onSubmit={handleManualSubmit} className="w-full max-w-xs mt-4 flex gap-2">
          <div className="relative flex-1">
            <Keyboard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="e.g. SHARMA-01 or Gupta"
              className="w-full bg-[#0A111E] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="bg-emerald-500 hover:bg-emerald-400 text-[#040812] px-4 py-2.5 rounded-xl font-bold text-xs"
          >
            Connect
          </button>
        </form>
      </div>

      {/* Quick Select Quick Chips */}
      <div className="bg-[#0A111E] border border-white/10 rounded-2xl p-3 z-20 max-w-sm mx-auto w-full">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Quick Select Print Station:</span>
        </p>
        <div className="grid grid-cols-2 gap-2">
          {shops.slice(0, 4).map((shop) => (
            <button
              key={shop.id}
              onClick={() => {
                onSelectShop(shop);
                onClose();
              }}
              className="bg-[#111A2C] hover:bg-[#1A263D] active:scale-95 transition-all p-2 rounded-xl border border-white/5 flex items-center gap-2 text-left"
            >
              <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <Store className="w-3.5 h-3.5" />
              </div>
              <div className="overflow-hidden">
                <p className="text-[11px] font-bold text-white truncate leading-tight">{shop.name}</p>
                <p className="text-[9px] text-emerald-400 font-semibold mt-0.5">₹{shop.bwPrice}/pg</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
