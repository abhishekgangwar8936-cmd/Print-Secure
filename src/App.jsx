import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { 
  UploadCloud, QrCode, Navigation, FileText, 
  Loader2, ArrowRight, Home, List, User, Settings, MapPin, Store, 
  X, Check, Plus, Trash2, Sparkles,
  Printer, Volume2, VolumeX,
  ChevronRight, Menu
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
const Shopkeeper = lazy(() => import('./shopkeeper'));
import PaymentModal from './components/PaymentModal';
import OrderSuccessModal from './components/OrderSuccessModal';
import ShopScannerModal from './components/ShopScannerModal';
import OrdersTab from './components/OrdersTab';
import ProfileTab from './components/ProfileTab';
import SettingsTab from './components/SettingsTab';
import { 
  getShops, getOrders, subscribeToSync, 
  createOrder, playNotificationSound, generateSampleDocumentUrl 
} from './services/storageService';

function UserApp() {
  const [currentTab, setCurrentTab] = useState('home'); // 'home', 'orders', 'profile', 'settings'
  const [shops, setShops] = useState(() => getShops());
  const [activeShop, setActiveShop] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [pageCount, setPageCount] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [allowView, setAllowView] = useState(false); 
  const [paymentMethod, setPaymentMethod] = useState('Pay Later'); 
  const [printType, setPrintType] = useState('B&W'); 
  const [printSides, setPrintSides] = useState('single'); // 'single' or 'double'
  const [finishing, setFinishing] = useState('none'); // 'none', 'stapled', 'spiral'
  const [specialNotes, setSpecialNotes] = useState('');
  const [isSoundMuted, setIsSoundMuted] = useState(false);
  const [showShopPicker, setShowShopPicker] = useState(false);

  // Modals & Popups
  const [isScanning, setIsScanning] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [inspectedTokenOrder, setInspectedTokenOrder] = useState(null);

  // User Orders
  const [userOrders, setUserOrders] = useState(() => getOrders());
  const [shredNotification, setShredNotification] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const fileInputRef = useRef(null);

  // Sync with cross-tab updates and state changes
  useEffect(() => {
    const unsubscribe = subscribeToSync((event) => {
      if (event.type === 'NEW_ORDER' || event.type === 'ORDER_UPDATED') {
        setUserOrders(getOrders());
      }
      if (event.type === 'SHOPS_UPDATED') {
        setShops(getShops());
      }
      if (event.type === 'DOCUMENT_SHREDDED') {
        setUserOrders(getOrders());
        if (!isSoundMuted) playNotificationSound('shred');
        setShredNotification({
          tokenId: event.tokenId,
          shopName: event.shopName || 'Print Shop',
          time: new Date(event.shreddedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        setTimeout(() => setShredNotification(null), 8000);
      }
    });
    return () => unsubscribe();
  }, [isSoundMuted]);

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const processFiles = async (files) => {
    if (files.length === 0) return;
    setSelectedFiles(files);
    setIsCalculating(true);
    let totalPages = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type === 'application/pdf') {
          const arrayBuffer = await file.arrayBuffer();
          const pdfDoc = await PDFDocument.load(arrayBuffer);
          totalPages += pdfDoc.getPageCount();
        } else {
          totalPages += 1;
        }
      }
      setPageCount(totalPages);
    } catch (error) {
      console.error("Page counting error:", error);
      setPageCount(files.length || 1);
    } finally {
      setIsCalculating(false);
      if (!activeShop) {
        setActiveShop(shops[0]);
      }
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    processFiles(files);
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  // Inject realistic sample lecture notes for 1-click test
  const handleLoadSampleDocument = () => {
    const sampleDocUrl = generateSampleDocumentUrl('DBMS Lecture Notes Unit-1', 'Relational Models & SQL Queries', 8);
    const mockFile = {
      name: 'DBMS_Notes_Unit1.pdf',
      size: 1048576,
      type: 'image/svg+xml',
      dataUrl: sampleDocUrl
    };
    setSelectedFiles([mockFile]);
    setPageCount(8);
    if (!activeShop) setActiveShop(shops[0]);
  };

  const removeFile = (index) => {
    const updated = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updated);
    if (updated.length === 0) {
      setPageCount(0);
    } else {
      setPageCount(Math.max(1, pageCount - 1));
    }
  };

  // Dynamic pricing based on active shop's rates
  const currentShop = activeShop || shops[0];
  const currentBwPrice = currentShop?.bwPrice ?? 2;
  const currentBwDoublePrice = currentShop?.bwDoublePrice ?? 1.5;
  const currentColorPrice = currentShop?.colorPrice ?? 10;
  const currentSpiralPrice = currentShop?.spiralPrice ?? 25;

  let perPagePrice = printType === 'Color' 
    ? currentColorPrice 
    : (printSides === 'double' ? currentBwDoublePrice : currentBwPrice);

  let finishingCost = finishing === 'spiral' ? currentSpiralPrice * quantity : 0;
  const totalAmount = (pageCount * perPagePrice * quantity) + finishingCost;

  // Handle Order Placement
  const handleInitiateOrder = () => {
    if (paymentMethod === 'Pay Now') {
      setShowPaymentModal(true);
    } else {
      executeOrderSubmission();
    }
  };

  const executeOrderSubmission = async (paymentDetails = null) => {
    setIsUploading(true);
    try {
      const orderPayload = {
        shopId: currentShop?.id || 'SHARMA-01',
        shopName: currentShop?.name || 'Sharma Stationers',
        customerName: 'Abhishek',
        customerPhone: '+91 98765 43210',
        pages: pageCount || 1,
        quantity,
        amount: totalAmount,
        printSides,
        finishing,
        notes: specialNotes,
        allowView,
        paymentMethod,
        paymentStatus: paymentDetails ? 'Paid' : (paymentMethod === 'Pay Now' ? 'Paid' : 'Pending'),
        printType
      };

      const result = await createOrder(orderPayload, selectedFiles);
      if (result.success) {
        if (!isSoundMuted) playNotificationSound('new_order');
        setPlacedOrder(result.order);
        setUserOrders(getOrders());

        // Reset composer
        setSelectedFiles([]);
        setPageCount(0);
        setQuantity(1);
        setPrintSides('single');
        setFinishing('none');
        setSpecialNotes('');
        setAllowView(false);
        setPaymentMethod('Pay Later');
        setPrintType('B&W');
      } else {
        alert('Could not create order. Please try again.');
      }
    } catch (err) {
      console.error('Order creation error:', err);
      alert('Error creating order.');
    } finally {
      setIsUploading(false);
      setShowPaymentModal(false);
    }
  };

  const pendingOrdersCount = userOrders.filter(o => o.status === 'pending' || o.status === 'printing').length;
  const activePendingOrder = userOrders.find(o => o.status === 'pending' || o.status === 'printing');

  return (
    <div className="min-h-screen w-full bg-[#030712] text-slate-100 flex flex-col selection:bg-emerald-500/30 font-sans antialiased">
      
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        multiple 
        className="hidden" 
        accept=".pdf,.png,.jpg,.jpeg" 
      />

      {/* TOP DESKTOP & MOBILE GLOBAL APP HEADER */}
      <header className="sticky top-0 z-40 bg-[#030712]/90 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 lg:px-8 py-3 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Logo & Brand Tagline */}
          <div 
            onClick={() => {
              setCurrentTab('home');
              setActiveShop(null);
            }}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 p-0.5 shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform shrink-0">
              <div className="w-full h-full bg-[#030712] rounded-[14px] flex items-center justify-center text-emerald-400">
                <Navigation className="w-5 h-5 -rotate-45" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-white tracking-tight">SoftPaper</span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                  Smart Xerox
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Campus Zero-Disk Print Point</p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 bg-[#0A111E] p-1 rounded-2xl border border-white/5">
            {[
              { id: 'home', label: 'Upload & Print', icon: UploadCloud },
              { id: 'orders', label: 'My Orders', icon: List, badge: pendingOrdersCount },
              { id: 'profile', label: 'Student Profile', icon: User },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all relative ${
                    isActive 
                      ? 'bg-emerald-500 text-[#040812] shadow-sm font-black' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.badge > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      isActive ? 'bg-black/20 text-black' : 'bg-emerald-500 text-black'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Header Action Tools */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            
            {/* Quick QR Scanner for Counter Standee */}
            <button
              onClick={() => setIsScanning(true)}
              className="p-2 sm:p-2.5 rounded-xl bg-[#0A111E] hover:bg-[#111A2C] border border-white/5 text-slate-300 hover:text-emerald-400 transition-all active:scale-95"
              title="Scan Counter QR"
            >
              <QrCode className="w-4 h-4 text-emerald-400" />
            </button>

            {/* Audio Mute/Unmute toggle */}
            <button
              onClick={() => setIsSoundMuted(!isSoundMuted)}
              className="p-2 sm:p-2.5 rounded-xl bg-[#0A111E] hover:bg-[#111A2C] border border-white/5 text-slate-400 hover:text-white transition-all active:scale-95"
              title={isSoundMuted ? 'Unmute Audio Chimes' : 'Mute Audio Chimes'}
            >
              {isSoundMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            {/* Direct Link to Shopkeeper Portal */}
            <Link
              to="/shop"
              className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-gradient-to-r from-orange-500/15 to-amber-500/15 hover:from-orange-500/25 hover:to-amber-500/25 border border-orange-500/30 text-orange-400 font-bold text-xs transition-all active:scale-95 shadow-sm"
              title="Open Xerox Shopkeeper Console"
            >
              <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Shop Terminal</span>
              <ArrowRight className="w-3 h-3 hidden md:inline" />
            </Link>

            {/* Mobile Hamburger Menu button */}
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 text-slate-300 hover:text-white active:scale-90 transition-transform rounded-xl bg-[#0A111E] border border-white/5"
              title="Menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>

        </div>
      </header>

      {/* LIVE PRIVACY AUTO-DELETION ALERT BANNER */}
      {shredNotification && (
        <div className="bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-emerald-500/20 border-b border-emerald-500/30 p-2.5 px-4 flex items-center justify-between text-xs animate-in slide-in-from-top duration-200">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-2 overflow-hidden">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5" />
              </div>
              <div className="overflow-hidden">
                <p className="font-black text-white text-xs leading-tight">
                  Document Auto-Destroyed & Shredded!
                </p>
                <p className="text-[11px] text-emerald-300/90 truncate">
                  Token #{shredNotification.tokenId} permanently purged from {shredNotification.shopName} at {shredNotification.time}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setShredNotification(null)}
              className="p-1 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 pb-24 lg:pb-8">
        
        {/* NON-HOME TABS */}
        {currentTab === 'orders' && (
          <div className="max-w-4xl mx-auto">
            <OrdersTab
              orders={userOrders}
              onShowToken={(order) => setInspectedTokenOrder(order)}
              onRefresh={() => setUserOrders(getOrders())}
            />
          </div>
        )}

        {currentTab === 'profile' && (
          <div className="max-w-2xl mx-auto">
            <ProfileTab ordersCount={userOrders.length} />
          </div>
        )}

        {currentTab === 'settings' && (
          <div className="max-w-2xl mx-auto">
            <SettingsTab onOrderCreated={(order) => setPlacedOrder(order)} />
          </div>
        )}

        {/* HOME TAB */}
        {currentTab === 'home' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-start animate-in fade-in duration-150">
                
                {/* LEFT COLUMN: ORDER COMPOSER & UPLOAD STATION (7 COLS) */}
                <div className="lg:col-span-7 space-y-4">
                  
                  {/* Greeting & Quick Tagline */}
                  <div className="flex items-center justify-between pb-1">
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                        Print in Seconds, <span className="text-emerald-400">Zero Footprint.</span>
                      </h1>
                      <p className="text-xs text-slate-400 mt-1">
                        Upload assignments or notes, select a campus shop, get an instant Token ID.
                      </p>
                    </div>

                    <button
                      onClick={handleLoadSampleDocument}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111A2C] hover:bg-[#1A263D] border border-white/5 text-emerald-400 text-xs font-bold transition-all active:scale-95 shadow-sm"
                      title="Load sample lecture notes to test the pipeline"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Test Sample Notes</span>
                    </button>
                  </div>

                  {/* Active Selected Shop Bar */}
                  <div className="bg-[#0A111E] border border-white/5 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between shadow-md gap-3">
                    <div className="flex items-center gap-3 overflow-hidden min-w-0">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shrink-0">
                        <Store className="w-5 h-5" />
                      </div>
                      <div className="overflow-hidden min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-black text-white truncate">{currentShop.name}</span>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            currentShop.isOpen ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400'
                          }`}>
                            {currentShop.isOpen ? 'Open Now' : 'Closed'}
                          </span>
                          <span className="text-amber-400 text-xs font-bold">★ {currentShop.rating}</span>
                        </div>
                        <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>{currentShop.distance} • B&W: ₹{currentBwPrice}/pg • Color: ₹{currentColorPrice}/pg</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button 
                        onClick={() => setShowShopPicker(true)} 
                        className="px-2.5 py-1.5 rounded-xl bg-[#111A2C] hover:bg-[#1A263D] text-emerald-400 border border-emerald-500/20 text-xs font-bold transition-all active:scale-95"
                        title="Change counter"
                      >
                        Change
                      </button>
                      <button 
                        onClick={() => setIsScanning(true)} 
                        className="p-2 sm:p-2.5 rounded-xl bg-[#111A2C] hover:bg-[#1A263D] text-slate-300 hover:text-emerald-400 transition-colors"
                        title="Scan Counter QR"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* LIVE IN-QUEUE PRINT PASS (VISIBLE AT TOP ON ALL DEVICES) */}
                  {activePendingOrder && (
                    <div 
                      onClick={() => setInspectedTokenOrder(activePendingOrder)}
                      className="bg-gradient-to-r from-emerald-950/60 via-[#0A111E] to-[#0A111E] border border-emerald-500/40 rounded-2xl p-3.5 sm:p-4 shadow-xl cursor-pointer active:scale-[0.99] transition-all group relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                            <Printer className="w-5 h-5 animate-pulse" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                              <p className="text-xs sm:text-sm font-black text-white">Live Print In Queue</p>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">{activePendingOrder.shopName} • {activePendingOrder.pages} pages</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-black text-xs">
                            #{activePendingOrder.tokenId}
                          </span>
                          <ChevronRight className="w-4 h-4 text-emerald-400" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Document Upload Zone with Drag & Drop */}
                  {selectedFiles.length === 0 ? (
                    <div 
                      onClick={handleUploadClick}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`w-full py-12 px-6 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-3 text-center cursor-pointer transition-all ${
                        isDragging 
                          ? 'border-emerald-400 bg-emerald-500/10 scale-[1.01]' 
                          : 'border-white/10 hover:border-emerald-500/40 bg-[#0A111E]/60 hover:bg-[#0A111E]'
                      }`}
                    >
                      <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
                        {isCalculating ? <Loader2 className="w-7 h-7 animate-spin" /> : <UploadCloud className="w-7 h-7" />}
                      </div>

                      <div>
                        <p className="text-base font-bold text-white">
                          Drag & drop documents here, or <span className="text-emerald-400 underline">browse</span>
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Supports PDF, PNG, JPG files • Automatic page count detection
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                        <span className="px-2.5 py-1 rounded-lg bg-white/5 text-[10px] text-slate-300 font-semibold">
                          📄 PDF Lecture Notes
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-white/5 text-[10px] text-slate-300 font-semibold">
                          🖼️ High-Res Scans
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-[10px] text-emerald-400 font-bold border border-emerald-500/20">
                          🔒 Zero-Disk Shred Guarantee
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLoadSampleDocument();
                        }}
                        className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#111A2C] hover:bg-[#1A263D] border border-emerald-500/30 text-emerald-400 text-xs font-bold transition-all active:scale-95 shadow-sm"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>⚡ Test with Sample Notes (1-Click)</span>
                      </button>
                    </div>
                  ) : (
                    /* STEP 1 & 2: INLINE WIZARD (OPTION B) */
                    <div className="space-y-4 animate-in fade-in duration-300">
                      
                      {/* STEP 1: ATTACHED DOCUMENTS CARD */}
                      <div className="bg-[#0A111E] border border-white/5 rounded-3xl p-5 space-y-4 shadow-xl">
                        <div className="flex items-center justify-between pb-3 border-b border-white/5">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-emerald-500 text-black font-black text-xs flex items-center justify-center">1</span>
                              <h3 className="text-sm font-black text-white">Documents Ready ({selectedFiles.length})</h3>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">Ready to print at {currentShop?.name}</p>
                          </div>
                          <button 
                            onClick={handleUploadClick}
                            className="text-xs text-emerald-400 font-bold hover:underline flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all active:scale-95"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add More
                          </button>
                        </div>

                        <div className="space-y-2 max-h-52 overflow-y-auto custom-scrollbar pr-1">
                          {selectedFiles.map((file, idx) => (
                            <div 
                              key={idx} 
                              className="bg-[#040812] border border-white/5 rounded-2xl p-3 flex items-center justify-between text-xs hover:border-white/10 transition-colors"
                            >
                              <div className="flex items-center gap-3 overflow-hidden min-w-0">
                                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div className="overflow-hidden min-w-0">
                                  <p className="font-bold text-white truncate text-xs">{file.name}</p>
                                  <span className="text-[10px] text-slate-400 font-medium">{(file.size / 1024).toFixed(0)} KB • Ready</span>
                                </div>
                              </div>
                              <button 
                                onClick={() => removeFile(idx)}
                                className="p-1.5 text-slate-500 hover:text-red-400 transition-colors rounded-lg hover:bg-white/5"
                                title="Remove file"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4" />
                            <span>Calculated Page Count:</span>
                          </div>
                          <span className="text-sm font-black">{pageCount} Total Pages</span>
                        </div>
                      </div>

                      {/* STEP 2: INLINE PRINT OPTIONS & FINISHING FORM */}
                      <div className="bg-[#0A111E] border border-white/5 rounded-3xl p-5 space-y-4 shadow-xl">
                        <div className="flex items-center justify-between pb-3 border-b border-white/5">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-500 text-black font-black text-xs flex items-center justify-center">2</span>
                            <h3 className="text-sm font-black text-white">Print Options & Finishing</h3>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            Step 2 of 2
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          
                          {/* Copies Stepper */}
                          <div className="bg-[#040812] p-3 rounded-2xl border border-white/5 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-white">Number of Sets</p>
                              <p className="text-[10px] text-slate-400">Total copies to print</p>
                            </div>
                            <div className="flex items-center bg-[#111A2C] p-1 rounded-xl border border-white/5">
                              <button 
                                onClick={() => setQuantity(q => Math.max(1, q - 1))} 
                                className="w-7 h-7 flex items-center justify-center bg-[#040812] rounded-lg text-slate-300 font-bold active:scale-90"
                              >
                                -
                              </button>
                              <span className="text-xs font-black w-8 text-center text-white">{quantity}</span>
                              <button 
                                onClick={() => setQuantity(q => q + 1)} 
                                className="w-7 h-7 flex items-center justify-center bg-[#040812] rounded-lg text-slate-300 font-bold active:scale-90"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Color Format */}
                          <div className="bg-[#040812] p-3 rounded-2xl border border-white/5 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-white">Color Mode</p>
                              <p className="text-[10px] text-slate-400">B&W or Color Laser</p>
                            </div>
                            <div className="flex bg-[#111A2C] p-1 rounded-xl border border-white/5">
                              <button 
                                onClick={() => setPrintType('B&W')} 
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                  printType === 'B&W' ? 'bg-slate-200 text-black shadow-sm font-black' : 'text-slate-400'
                                }`}
                              >
                                B&W (₹{currentBwPrice})
                              </button>
                              <button 
                                onClick={() => setPrintType('Color')} 
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                  printType === 'Color' ? 'bg-blue-500 text-white shadow-sm font-black' : 'text-slate-400'
                                }`}
                              >
                                Color (₹{currentColorPrice})
                              </button>
                            </div>
                          </div>

                          {/* Sides: Single or Double Sided Duplex */}
                          <div className="bg-[#040812] p-3 rounded-2xl border border-white/5 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-white">Page Sides</p>
                              <p className="text-[10px] text-slate-400">Paper-saving Duplex</p>
                            </div>
                            <div className="flex bg-[#111A2C] p-1 rounded-xl border border-white/5">
                              <button 
                                onClick={() => setPrintSides('single')} 
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                  printSides === 'single' ? 'bg-slate-200 text-black shadow-sm font-black' : 'text-slate-400'
                                }`}
                              >
                                Single Side
                              </button>
                              <button 
                                onClick={() => setPrintSides('double')} 
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                  printSides === 'double' ? 'bg-emerald-500 text-[#040812] shadow-sm font-black' : 'text-slate-400'
                                }`}
                              >
                                Front & Back
                              </button>
                            </div>
                          </div>

                          {/* Finishing / Binding Option */}
                          <div className="bg-[#040812] p-3 rounded-2xl border border-white/5 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-white">Binding / Finish</p>
                              <p className="text-[10px] text-slate-400">Loose, staple, or spiral</p>
                            </div>
                            <div className="flex bg-[#111A2C] p-1 rounded-xl border border-white/5">
                              <button 
                                onClick={() => setFinishing('none')} 
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                  finishing === 'none' ? 'bg-slate-200 text-black font-black' : 'text-slate-400'
                                }`}
                              >
                                None
                              </button>
                              <button 
                                onClick={() => setFinishing('stapled')} 
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                  finishing === 'stapled' ? 'bg-emerald-500 text-black font-black' : 'text-slate-400'
                                }`}
                              >
                                Staple
                              </button>
                              <button 
                                onClick={() => setFinishing('spiral')} 
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                  finishing === 'spiral' ? 'bg-orange-500 text-black font-black' : 'text-slate-400'
                                }`}
                              >
                                Spiral (+₹{currentSpiralPrice})
                              </button>
                            </div>
                          </div>

                        </div>

                        {/* Privacy margin toggle & Notes input */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          
                          {/* Privacy Toggle */}
                          <div 
                            onClick={() => setAllowView(!allowView)} 
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                              allowView ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-[#040812] border-white/5'
                            }`}
                          >
                            <div>
                              <p className={`text-xs font-bold ${allowView ? 'text-emerald-400' : 'text-white'}`}>Allow Shopkeeper Preview</p>
                              <p className="text-[10px] text-slate-400">Permit operator to verify margins</p>
                            </div>
                            <div className={`w-8 h-4.5 rounded-full flex items-center px-0.5 transition-colors ${allowView ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                              <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${allowView ? 'translate-x-3.5' : 'translate-x-0'}`}></div>
                            </div>
                          </div>

                          {/* Special instructions */}
                          <div className="bg-[#040812] p-2.5 rounded-xl border border-white/5">
                            <input
                              type="text"
                              value={specialNotes}
                              onChange={(e) => setSpecialNotes(e.target.value)}
                              placeholder="Note for shop (e.g. staple unit 1 separately)"
                              className="w-full bg-transparent border-none text-xs text-white placeholder-slate-500 outline-none"
                            />
                          </div>

                        </div>

                        {/* Payment Mode Selector */}
                        <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-white">Payment Selection</p>
                            <p className="text-[10px] text-slate-400">Pay now or pay cash at counter</p>
                          </div>
                          <div className="flex bg-[#040812] p-1 rounded-xl border border-white/5">
                            <button 
                              onClick={() => setPaymentMethod('Pay Now')} 
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                paymentMethod === 'Pay Now' ? 'bg-emerald-500 text-[#040812] font-black shadow-sm' : 'text-slate-400'
                              }`}
                            >
                              Pay Online (UPI / QR)
                            </button>
                            <button 
                              onClick={() => setPaymentMethod('Pay Later')} 
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                paymentMethod === 'Pay Later' ? 'bg-orange-500 text-[#040812] font-black shadow-sm' : 'text-slate-400'
                              }`}
                            >
                              Pay at Counter
                            </button>
                          </div>
                        </div>

                        {/* Itemized Bill & Primary Send Button */}
                        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                              <span>{pageCount} pgs</span>
                              <span>•</span>
                              <span>{quantity} cpy</span>
                              {finishing !== 'none' && <span>• {finishing}</span>}
                              <span>•</span>
                              <span className="text-emerald-400 font-bold">{printType}</span>
                            </div>
                            <div className="flex items-baseline gap-1 mt-0.5">
                              <span className="text-sm font-bold text-emerald-400">₹</span>
                              <strong className="text-3xl font-black text-white">{totalAmount}</strong>
                              <span className="text-xs text-slate-500 ml-1">Total Bill</span>
                            </div>
                          </div>

                          <button 
                            onClick={handleInitiateOrder} 
                            disabled={isUploading || selectedFiles.length === 0} 
                            className={`px-7 py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl disabled:opacity-40 transition-all active:scale-95 ${
                              paymentMethod === 'Pay Now' 
                                ? 'bg-emerald-500 hover:bg-emerald-400 text-[#040812] shadow-emerald-500/20' 
                                : 'bg-orange-500 hover:bg-orange-400 text-[#040812] shadow-orange-500/20'
                            }`}
                          >
                            {isUploading ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Sending Document...</span>
                              </>
                            ) : (
                              <>
                                <span>{paymentMethod === 'Pay Now' ? `Pay ₹${totalAmount} & Send Order` : 'Send Order & Get Token'}</span>
                                <ArrowRight className="w-4 h-4" />
                              </>
                            )}
                          </button>
                        </div>

                      </div>

                    </div>
                  )}

                </div>

                {/* RIGHT COLUMN: CAMPUS HUB & NEARBY SHOPS (5 COLS) */}
                <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-20">

                  {/* NEARBY CAMPUS PRINT SHOPS DIRECTORY */}
                  <div className="bg-[#0A111E] border border-white/5 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                      <div>
                        <h3 className="text-sm font-black text-white">Campus Print Shops</h3>
                        <p className="text-[11px] text-slate-400">Select counter to print instantly</p>
                      </div>
                      <button
                        onClick={() => setIsScanning(true)}
                        className="px-2.5 py-1 rounded-xl bg-[#111A2C] hover:bg-[#1A263D] text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center gap-1.5 transition-all"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Scan QR</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {shops.map((shop) => {
                        const isSelected = currentShop?.id === shop.id;
                        return (
                          <div
                            key={shop.id}
                            onClick={() => setActiveShop(shop)}
                            className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                              isSelected 
                                ? 'bg-[#111A2C] border-emerald-500/40 shadow-sm' 
                                : 'bg-[#040812] border-white/5 hover:border-white/15'
                            }`}
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 font-bold text-xs ${
                                isSelected ? 'bg-emerald-500 text-black font-black' : 'bg-[#131d2e] text-slate-300'
                              }`}>
                                <Store className="w-4 h-4" />
                              </div>

                              <div className="overflow-hidden">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-xs font-bold text-white truncate">{shop.name}</p>
                                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                    shop.isOpen ? 'text-emerald-400' : 'text-red-400'
                                  }`}>
                                    {shop.isOpen ? 'Open' : 'Closed'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                  <span className="text-amber-400 font-bold">★ {shop.rating}</span>
                                  <span>•</span>
                                  <span>{shop.distance}</span>
                                  <span>•</span>
                                  <span className="text-emerald-400 font-semibold">₹{shop.bwPrice}/pg</span>
                                </div>
                              </div>
                            </div>

                            <button className={`text-xs font-bold px-3 py-1 rounded-xl transition-all ${
                              isSelected ? 'bg-emerald-500 text-black font-black' : 'text-slate-400 hover:text-white'
                            }`}>
                              {isSelected ? 'Selected' : 'Pick'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>

              </div>
        )}

      </main>

      {/* MOBILE HAMBURGER DRAWER */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
          <div className="w-72 max-w-[85vw] h-full bg-[#0a111e] border-l border-white/10 p-5 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#092922] border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                    <Navigation className="w-4 h-4 -rotate-45" />
                  </div>
                  <span className="font-bold text-white text-base">SoftPaper</span>
                </div>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg active:scale-95"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User summary */}
              <div className="flex items-center gap-3 py-4 border-b border-white/5">
                <div className="w-10 h-10 rounded-full bg-[#1e293b] border border-white/10 text-slate-300 flex items-center justify-center font-bold text-sm">
                  A
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Abhishek Sharma</p>
                  <p className="text-slate-400 text-xs">Ready to print</p>
                </div>
              </div>

              {/* Navigation items */}
              <div className="flex flex-col gap-1.5 pt-4">
                <button 
                  onClick={() => { setCurrentTab('home'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${currentTab === 'home' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-300 hover:bg-white/5'}`}
                >
                  <Home className="w-4 h-4" />
                  <span>Home & Upload</span>
                </button>

                <button 
                  onClick={() => { setCurrentTab('orders'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${currentTab === 'orders' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-300 hover:bg-white/5'}`}
                >
                  <div className="flex items-center gap-3">
                    <List className="w-4 h-4" />
                    <span>My Orders</span>
                  </div>
                  {pendingOrdersCount > 0 && (
                    <span className="bg-emerald-500 text-black text-[10px] font-black px-1.5 py-0.5 rounded-full">
                      {pendingOrdersCount}
                    </span>
                  )}
                </button>

                <button 
                  onClick={() => { setCurrentTab('profile'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${currentTab === 'profile' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-300 hover:bg-white/5'}`}
                >
                  <User className="w-4 h-4" />
                  <span>Student Profile</span>
                </button>

                <button 
                  onClick={() => { setCurrentTab('settings'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${currentTab === 'settings' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-300 hover:bg-white/5'}`}
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </button>

                <div className="my-2 border-t border-white/5"></div>

                <Link
                  to="/shop"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold bg-[#131d2e] hover:bg-[#1a273e] text-blue-400 border border-blue-500/20 transition-all text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <Store className="w-4 h-4" />
                    <span>Shopkeeper Console</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 text-center">
              <p className="text-[10px] text-slate-500 font-medium">SoftPaper System v2.0</p>
              <p className="text-[9px] text-emerald-400/70 mt-0.5">Zero-Trace Privacy & Auto-Shred</p>
            </div>
          </div>
        </div>
      )}

      {/* STICKY MOBILE CHECKOUT BAR (Visible on Mobile only when files are selected) */}
      {currentTab === 'home' && selectedFiles.length > 0 && (
        <div className="lg:hidden fixed bottom-[58px] left-0 right-0 z-30 bg-[#040812]/95 backdrop-blur-xl border-t border-white/10 px-4 py-2.5 flex items-center justify-between shadow-2xl">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-bold text-emerald-400">₹</span>
              <span className="text-xl font-black text-white">{totalAmount}</span>
            </div>
            <p className="text-[10px] text-slate-400">
              {pageCount} pgs • {quantity} {quantity === 1 ? 'set' : 'sets'} • {printType}
            </p>
          </div>

          <button
            onClick={handleInitiateOrder}
            disabled={isUploading}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition-all disabled:opacity-40"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <span>{paymentMethod === 'Pay Now' ? `Pay ₹${totalAmount} & Send` : 'Send Order'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      )}

      {/* NATIVE MOBILE DOCKED BOTTOM NAV (Phone screens only) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#030712]/95 backdrop-blur-xl border-t border-white/10 px-4 py-2 flex justify-around items-center shadow-[0_-4px_24px_rgba(0,0,0,0.6)] pb-[max(env(safe-area-inset-bottom),0.6rem)]">
        {[
          { id: 'home', label: 'Home', icon: Home },
          { id: 'orders', label: 'Orders', icon: List, badge: pendingOrdersCount },
          { id: 'profile', label: 'Profile', icon: User },
          { id: 'settings', label: 'Settings', icon: Settings },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button 
              key={item.id}
              onClick={() => {
                setCurrentTab(item.id);
                if (item.id !== 'home') setActiveShop(null);
              }}
              className={`flex flex-col items-center gap-1 transition-all relative py-1 px-3 ${
                isActive ? 'text-emerald-400 scale-105 font-black' : 'text-slate-500 hover:text-slate-300 font-bold'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]' : ''}`} />
              <span className="text-[9px] tracking-wide uppercase">{item.label}</span>
              {item.badge > 0 && (
                <span className="absolute top-0 right-2 w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              )}
            </button>
          );
        })}
      </nav>

      {/* SHOP COUNTER SELECTOR MODAL */}
      {showShopPicker && (
        <div className="fixed inset-0 z-[115] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-[#0A111E] border border-white/10 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-orange-400" />
                <h3 className="text-sm font-black text-white">Select Print Counter</h3>
              </div>
              <button 
                onClick={() => setShowShopPicker(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              {shops.map((shop) => {
                const isSelected = currentShop?.id === shop.id;
                return (
                  <div
                    key={shop.id}
                    onClick={() => {
                      setActiveShop(shop);
                      setShowShopPicker(false);
                    }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected 
                        ? 'bg-[#111A2C] border-emerald-500/40 shadow-md' 
                        : 'bg-[#040812] border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-emerald-500 text-black font-black' : 'bg-[#131d2e] text-slate-300'
                      }`}>
                        <Store className="w-5 h-5" />
                      </div>
                      <div className="overflow-hidden min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs sm:text-sm font-bold text-white truncate">{shop.name}</p>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                            shop.isOpen ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            {shop.isOpen ? 'Open' : 'Closed'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {shop.distance} • B&W: ₹{shop.bwPrice}/pg • Color: ₹{shop.colorPrice}/pg
                        </p>
                      </div>
                    </div>

                    <button className={`text-xs font-bold px-3 py-1.5 rounded-xl shrink-0 ${
                      isSelected ? 'bg-emerald-500 text-black font-black' : 'bg-white/5 text-slate-300'
                    }`}>
                      {isSelected ? 'Selected' : 'Choose'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* QR SCANNER MODAL */}
      {isScanning && (
        <ShopScannerModal
          shops={shops}
          onSelectShop={(shop) => {
            setActiveShop(shop);
            setIsScanning(false);
          }}
          onClose={() => setIsScanning(false)}
        />
      )}

      {/* PAYMENT MODAL */}
      {showPaymentModal && (
        <PaymentModal
          amount={totalAmount}
          shop={currentShop}
          onPaymentSuccess={(details) => executeOrderSubmission(details)}
          onClose={() => setShowPaymentModal(false)}
        />
      )}

      {/* ORDER PLACED MODAL */}
      {placedOrder && (
        <OrderSuccessModal
          order={placedOrder}
          onTrackOrders={() => {
            setPlacedOrder(null);
            setCurrentTab('orders');
          }}
          onClose={() => setPlacedOrder(null)}
        />
      )}

      {/* INSPECT TOKEN MODAL */}
      {inspectedTokenOrder && (
        <OrderSuccessModal
          order={inspectedTokenOrder}
          onTrackOrders={() => setInspectedTokenOrder(null)}
          onClose={() => setInspectedTokenOrder(null)}
        />
      )}

    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={
        <div className="min-h-screen bg-[#02050A] flex flex-col items-center justify-center text-white gap-3">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          <p className="text-xs text-slate-400 font-bold">Loading SoftPaper Terminal...</p>
        </div>
      }>
        <Routes>
          <Route path="/" element={<UserApp />} />
          <Route path="/shop" element={<Shopkeeper />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}