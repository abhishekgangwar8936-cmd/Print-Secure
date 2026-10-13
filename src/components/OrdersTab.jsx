import { useState, useMemo } from 'react';
import { 
  FileText, Store, Clock, CheckCircle2, Loader2, QrCode, 
  ChevronRight, Sparkles, RefreshCw, Search, XCircle, ShieldCheck
} from 'lucide-react';
import { cancelOrder } from '../services/storageService';

export default function OrdersTab({ orders = [], onShowToken, onRefresh }) {
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'printing', 'ready', 'completed'
  const [searchQuery, setSearchQuery] = useState('');

  // Counts for tabs
  const counts = useMemo(() => {
    return {
      all: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      printing: orders.filter(o => o.status === 'printing').length,
      ready: orders.filter(o => o.status === 'ready').length,
      completed: orders.filter(o => o.status === 'completed').length,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Status filter
      if (filter === 'pending' && o.status !== 'pending') return false;
      if (filter === 'printing' && o.status !== 'printing') return false;
      if (filter === 'ready' && o.status !== 'ready') return false;
      if (filter === 'completed' && o.status !== 'completed') return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesToken = o.tokenId?.toLowerCase().includes(q);
        const matchesShop = o.shopName?.toLowerCase().includes(q);
        const matchesFile = o.files?.some(f => f.name?.toLowerCase().includes(q));
        if (!matchesToken && !matchesShop && !matchesFile) return false;
      }

      return true;
    });
  }, [orders, filter, searchQuery]);

  const handleCancelOrder = (orderId, e) => {
    e.stopPropagation();
    if (window.confirm('Cancel this pending order?')) {
      cancelOrder(orderId);
      if (onRefresh) onRefresh();
    }
  };

  const getStatusBadge = (order) => {
    if (order.filesShredded) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <ShieldCheck className="w-3 h-3 text-emerald-400" /> Auto-Shredded
        </span>
      );
    }
    switch (order.status) {
      case 'printing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" /> Printing Now
          </span>
        );
      case 'ready':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Sparkles className="w-3 h-3 text-amber-300" /> Ready for Pickup
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-500/20 text-slate-300 border border-slate-500/30">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30">
            <XCircle className="w-3 h-3" /> Cancelled
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3" /> In Shop Queue
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      
      {/* Header with Search and Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>My Print Orders</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
              {orders.length}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Live tracking, tokens & instant counter verification</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search Bar */}
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search token or shop..."
              className="w-full bg-[#0A111E] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition-colors"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                ×
              </button>
            )}
          </div>

          <button
            onClick={onRefresh}
            className="p-2 bg-[#0A111E] hover:bg-[#111A2C] text-slate-300 hover:text-white rounded-xl border border-white/5 active:scale-95 transition-all shadow-sm"
            title="Refresh Orders"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Tabs with Dynamic Counters */}
      <div className="flex overflow-x-auto hide-scrollbar gap-1.5 bg-[#0A111E] p-1.5 rounded-2xl border border-white/5">
        {[
          { id: 'all', label: 'All', count: counts.all },
          { id: 'pending', label: 'In Queue', count: counts.pending },
          { id: 'printing', label: 'Printing', count: counts.printing },
          { id: 'ready', label: 'Ready', count: counts.ready },
          { id: 'completed', label: 'Completed', count: counts.completed },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              filter === tab.id
                ? 'bg-emerald-500 text-[#040812] shadow-sm font-black'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                filter === tab.id ? 'bg-black/20 text-black' : 'bg-white/10 text-slate-300'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Orders Grid */}
      <div>
        {filteredOrders.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center p-6 bg-[#0A111E]/70 rounded-3xl border border-white/5">
            <div className="w-14 h-14 rounded-2xl bg-[#111A2C] flex items-center justify-center text-slate-500 mb-3">
              <FileText className="w-7 h-7" />
            </div>
            <p className="text-white font-bold text-base">No Orders Match Filter</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              {searchQuery ? 'Try clearing your search query or switching filters.' : 'Upload documents and send your first campus print!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredOrders.map((order) => {
              const isPending = order.status === 'pending';
              const isPrinting = order.status === 'printing';
              const isReady = order.status === 'ready';

              return (
                <div
                  key={order._id}
                  className={`bg-[#0A111E] border rounded-2xl p-4 shadow-md flex flex-col justify-between gap-3.5 transition-all group ${
                    isReady 
                      ? 'border-emerald-500/40 bg-gradient-to-b from-[#0a1a1f] to-[#0A111E]' 
                      : isPrinting
                      ? 'border-blue-500/30'
                      : 'border-white/5 hover:border-white/15'
                  }`}
                >
                  <div>
                    {/* Top Row: Token, Date & Status */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <div className="px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-500/15 to-teal-500/15 border border-emerald-500/30 text-emerald-400 font-black text-sm tracking-wider shadow-sm">
                          #{order.tokenId}
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 block font-medium">
                            {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {getStatusBadge(order)}
                    </div>

                    {/* Shop & Print Details Box */}
                    <div className="bg-[#040812] p-3 rounded-xl border border-white/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shrink-0">
                            <Store className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-xs text-white font-bold truncate">{order.shopName}</span>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-base font-black text-white">₹{order.amount}</span>
                          <span className="text-[9px] uppercase font-bold text-slate-500 block leading-none">
                            {order.paymentStatus === 'Paid' ? 'Paid Online' : 'Pay at Counter'}
                          </span>
                        </div>
                      </div>

                      {/* File Names & Spec Badges */}
                      <div className="pt-2 border-t border-white/5 flex flex-wrap gap-1.5 text-[10px]">
                        <span className="bg-white/5 text-slate-300 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                          <FileText className="w-3 h-3 text-emerald-400" />
                          {order.files?.[0]?.name || 'Document.pdf'}
                          {order.files?.length > 1 && ` +${order.files.length - 1} more`}
                        </span>
                        <span className="bg-white/5 text-slate-300 px-2 py-0.5 rounded-md font-medium">
                          {order.pages} pgs × {order.quantity} cpy
                        </span>
                        <span className={`px-2 py-0.5 rounded-md font-bold ${
                          order.printType === 'Color' ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-slate-300'
                        }`}>
                          {order.printType}
                        </span>
                        {order.printSides && (
                          <span className="bg-white/5 text-slate-400 px-2 py-0.5 rounded-md">
                            {order.printSides === 'double' ? 'Front & Back (Duplex)' : 'Single Sided'}
                          </span>
                        )}
                        {order.finishing && order.finishing !== 'none' && (
                          <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md font-bold">
                            {order.finishing === 'spiral' ? 'Spiral Bind' : 'Stapled'}
                          </span>
                        )}
                      </div>

                      {/* Special instructions / notes if any */}
                      {order.notes && (
                        <div className="text-[10px] text-slate-400 italic pt-1 border-t border-white/5">
                          Note: "{order.notes}"
                        </div>
                      )}
                    </div>

                    {/* Privacy Auto-Shred Notification Banner */}
                    {order.filesShredded && (
                      <div className="mt-2.5 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                        <span>Zero-Trace Complete: Binary memory auto-deleted post print.</span>
                      </div>
                    )}
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => onShowToken(order)}
                      className="flex-1 bg-[#111A2C] hover:bg-[#1A263D] active:scale-[0.98] transition-all text-xs font-bold text-emerald-400 py-2.5 px-3 rounded-xl border border-white/5 flex items-center justify-center gap-2 shadow-sm"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Show Token QR</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    </button>

                    {isPending && (
                      <button
                        onClick={(e) => handleCancelOrder(order._id, e)}
                        className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/20 text-xs font-bold transition-colors"
                        title="Cancel Order"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
