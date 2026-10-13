import { CheckCircle, ArrowRight, Store, FileText, IndianRupee, Clock, X } from 'lucide-react';

export default function OrderSuccessModal({ order, onTrackOrders, onClose }) {
  if (!order) return null;

  return (
    <div className="fixed inset-0 z-[125] bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#0A111E] border border-white/10 rounded-3xl sm:rounded-[2.5rem] p-5 sm:p-6 w-full max-w-sm shadow-2xl relative overflow-hidden flex flex-col items-center text-center animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto hide-scrollbar">
        <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>

        {/* Success Icon */}
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mt-2 mb-3 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
          <CheckCircle className="w-8 h-8" />
        </div>

        <h3 className="text-xl font-black text-white">Order Sent Successfully!</h3>
        <p className="text-[11px] text-slate-400 mt-1">Show this token or QR at the shop counter</p>

        {/* Token Card */}
        <div className="w-full bg-[#040812] border border-white/5 rounded-2xl p-4 my-4 flex flex-col items-center gap-3">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Your Print Token</span>
          <div className="px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
            <span className="text-3xl font-black text-emerald-400 tracking-wider">{order.tokenId}</span>
          </div>

          {/* QR Code for shopkeeper to scan */}
          <div className="bg-white p-2.5 rounded-xl shadow-md">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=TOKEN:${order.tokenId}|ORDER:${order._id}&margin=4`}
              alt="Token QR"
              className="w-28 h-28 pointer-events-none"
            />
          </div>
          <span className="text-[9px] text-slate-500 font-medium">Scan to identify at shop</span>
        </div>

        {/* Order Details Mini Grid */}
        <div className="w-full grid grid-cols-2 gap-2 text-left mb-4">
          <div className="bg-[#111A2C] p-2.5 rounded-xl border border-white/5 flex items-center gap-2">
            <Store className="w-4 h-4 text-orange-400 shrink-0" />
            <div className="overflow-hidden">
              <span className="text-[8px] text-slate-400 font-bold uppercase block">Shop</span>
              <p className="text-[11px] font-bold text-white truncate">{order.shopName}</p>
            </div>
          </div>

          <div className="bg-[#111A2C] p-2.5 rounded-xl border border-white/5 flex items-center gap-2">
            <IndianRupee className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="text-[8px] text-slate-400 font-bold uppercase block">Amount</span>
              <p className="text-[11px] font-bold text-emerald-400">₹{order.amount} ({order.paymentStatus})</p>
            </div>
          </div>

          <div className="bg-[#111A2C] p-2.5 rounded-xl border border-white/5 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-400 shrink-0" />
            <div>
              <span className="text-[8px] text-slate-400 font-bold uppercase block">Files & Copies</span>
              <p className="text-[11px] font-bold text-white">{order.files?.length || 1} files • {order.quantity} cpy</p>
            </div>
          </div>

          <div className="bg-[#111A2C] p-2.5 rounded-xl border border-white/5 flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-400 shrink-0" />
            <div>
              <span className="text-[8px] text-slate-400 font-bold uppercase block">Estimated</span>
              <p className="text-[11px] font-bold text-white">~3-5 mins</p>
            </div>
          </div>
        </div>

        {/* Privacy Auto-Shred Guarantee Box */}
        <div className="w-full mb-4 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-left text-xs flex items-center gap-2 text-emerald-400">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="text-[10px] leading-tight">
            <span className="font-black block text-white">🔒 Zero-Trace Privacy Protocol:</span>
            <span>Your files are auto-deleted from shop memory immediately after printing.</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-2">
          <button
            onClick={onTrackOrders}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-[#040812] font-black text-xs py-3.5 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span>Track in My Orders</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="w-full bg-[#111A2C] hover:bg-[#1A263D] text-slate-300 font-bold text-xs py-3 rounded-xl transition-all"
          >
            Print More Documents
          </button>
        </div>
      </div>
    </div>
  );
}
