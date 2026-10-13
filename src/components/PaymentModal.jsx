import { useState } from 'react';
import { X, CheckCircle, Smartphone, CreditCard, QrCode, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';

export default function PaymentModal({ amount, shop, onPaymentSuccess, onClose }) {
  const [method, setMethod] = useState('upi'); // 'upi', 'qr', 'card'
  const [upiId, setUpiId] = useState('abhishek@okhdfcbank');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handlePay = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      setTimeout(() => {
        onPaymentSuccess({ transactionId: 'TXN_' + Math.floor(100000 + Math.random() * 900000) });
      }, 900);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#0A111E] border border-white/10 rounded-3xl sm:rounded-[2rem] p-5 sm:p-6 w-full max-w-sm shadow-2xl relative overflow-hidden flex flex-col gap-4 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto hide-scrollbar">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-white font-bold text-base leading-tight">SoftPaper Pay</h3>
              <p className="text-[10px] text-slate-400">Instant & 100% Secure</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="py-8 flex flex-col items-center text-center animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mb-3">
              <CheckCircle className="w-10 h-10 animate-bounce" />
            </div>
            <h4 className="text-lg font-black text-white">Payment Successful!</h4>
            <p className="text-emerald-400 font-bold text-sm mt-1">₹{amount} Paid to {shop?.name || 'Shop'}</p>
            <p className="text-[11px] text-slate-400 mt-2">Placing your print order now...</p>
          </div>
        ) : (
          <>
            {/* Amount badge */}
            <div className="bg-[#040812] border border-white/5 rounded-2xl p-4 flex justify-between items-center">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Paying to</p>
                <p className="text-white font-bold text-sm truncate max-w-[180px]">{shop?.name || 'Print Station'}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-emerald-400 font-bold">Total Due</span>
                <p className="text-2xl font-black text-emerald-400 leading-none mt-0.5">₹{amount}</p>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMethod('upi')}
                className={`py-2.5 px-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                  method === 'upi'
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                    : 'bg-[#111A2C] border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span className="text-[10px] font-bold">UPI Apps</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('qr')}
                className={`py-2.5 px-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                  method === 'qr'
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                    : 'bg-[#111A2C] border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span className="text-[10px] font-bold">Scan QR</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('card')}
                className={`py-2.5 px-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                  method === 'card'
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                    : 'bg-[#111A2C] border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span className="text-[10px] font-bold">Card / Net</span>
              </button>
            </div>

            {/* Method Content */}
            {method === 'upi' && (
              <div className="space-y-3 bg-[#040812] p-3.5 rounded-2xl border border-white/5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Fast UPI Apps:</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {['GPay', 'PhonePe', 'Paytm', 'BHIM'].map((app) => (
                    <button
                      key={app}
                      onClick={handlePay}
                      className="bg-[#111A2C] hover:bg-[#1A263D] active:scale-95 transition-all p-2 rounded-xl flex flex-col items-center border border-white/5"
                    >
                      <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-black text-white mb-1">
                        {app[0]}
                      </div>
                      <span className="text-[9px] font-bold text-slate-300">{app}</span>
                    </button>
                  ))}
                </div>
                <div className="pt-1">
                  <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Or enter UPI ID</label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full bg-[#111A2C] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                    placeholder="username@upi"
                  />
                </div>
              </div>
            )}

            {method === 'qr' && (
              <div className="bg-[#040812] p-4 rounded-2xl border border-white/5 flex flex-col items-center text-center">
                <div className="bg-white p-2.5 rounded-xl shadow-md mb-2">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=upi://pay?pa=${shop?.upiId || 'softpaper@upi'}&pn=${encodeURIComponent(shop?.name || 'SoftPaper')}&am=${amount}&cu=INR`}
                    alt="UPI QR"
                    className="w-32 h-32"
                  />
                </div>
                <p className="text-[10px] text-slate-400">Scan with any UPI App to pay ₹{amount}</p>
                <p className="text-[9px] text-emerald-400/80 mt-0.5">UPI ID: {shop?.upiId || 'softpaper@upi'}</p>
              </div>
            )}

            {method === 'card' && (
              <div className="bg-[#040812] p-3.5 rounded-2xl border border-white/5 space-y-2 text-left">
                <div>
                  <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Card Number</label>
                  <input
                    type="text"
                    defaultValue="4532 •••• •••• 8920"
                    className="w-full bg-[#111A2C] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Expiry</label>
                    <input
                      type="text"
                      defaultValue="08/29"
                      className="w-full bg-[#111A2C] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">CVV</label>
                    <input
                      type="password"
                      defaultValue="•••"
                      className="w-full bg-[#111A2C] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Action button */}
            <button
              onClick={handlePay}
              disabled={isProcessing}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-[#040812] font-black text-sm py-3.5 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95 transition-all flex items-center justify-center gap-2 mt-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authorizing Payment...</span>
                </>
              ) : (
                <>
                  <span>Simulate Instant Pay ₹{amount}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
