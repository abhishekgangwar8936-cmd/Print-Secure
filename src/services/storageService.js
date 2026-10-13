// SoftPaper In-Browser Database & Real-Time Sync Service
// Provides zero-dependency IndexedDB storage for files + LocalStorage for state + BroadcastChannel for real-time tab sync

const DB_NAME = 'softpaper_db';
const DB_VERSION = 1;
const STORE_FILES = 'documents';

// Helper to generate a realistic SVG document data URL for sample/demo files
export function generateSampleDocumentUrl(title = 'Sample Document', subtitle = 'SoftPaper Verified Document', pages = 1) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1132" viewBox="0 0 800 1132">
    <defs>
      <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f172a"/>
        <stop offset="100%" stop-color="#1e293b"/>
      </linearGradient>
    </defs>
    <rect width="800" height="1132" fill="#ffffff" />
    <rect x="36" y="36" width="728" height="1060" fill="none" stroke="#e2e8f0" stroke-width="1.5" rx="4" />
    
    <!-- Header banner -->
    <rect x="56" y="56" width="688" height="96" fill="url(#headerGrad)" rx="8" />
    <text x="80" y="98" font-family="'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="bold" fill="#38bdf8">${title}</text>
    <text x="80" y="126" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="500" fill="#94a3b8">${subtitle} • SoftPaper Smart Print System</text>
    <circle cx="704" cy="104" r="20" fill="#0369a1" />
    <path d="M696 104 L702 110 L714 96" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

    <!-- Content Section -->
    <text x="56" y="190" font-family="'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="bold" fill="#0f172a">CHAPTER 1: SYSTEM OVERVIEW & ARCHITECTURAL SUMMARY</text>
    <line x1="56" y1="202" x2="744" y2="202" stroke="#0284c7" stroke-width="2" />

    <text x="56" y="235" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" fill="#334155">SoftPaper eliminates physical USB pen-drives, untrusted shared computers, and WhatsApp document</text>
    <text x="56" y="255" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" fill="#334155">leakages at campus Xerox and neighborhood print counters. Every file uploaded is encrypted in-memory</text>
    <text x="56" y="275" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" fill="#334155">and linked to a single-use Token ID with automatic post-print shredding protocols.</text>

    <!-- Code / Key Metrics Box -->
    <rect x="56" y="305" width="688" height="135" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1" rx="6" />
    <text x="76" y="335" font-family="monospace" font-size="12" font-weight="bold" fill="#0284c7">// Core Operational Pipeline</text>
    <text x="76" y="360" font-family="monospace" font-size="12" fill="#0f172a">1. Student selects local shop counter (Distance: 150m, Sharma Stationers)</text>
    <text x="76" y="385" font-family="monospace" font-size="12" fill="#0f172a">2. Client compiles PDF page counts via web workers & generates token #SP-108</text>
    <text x="76" y="410" font-family="monospace" font-size="12" fill="#0f172a">3. Hardware prints document & triggers Zero-Disk Auto-Shredding purge</text>

    <!-- Diagram / Table Mockup -->
    <text x="56" y="475" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="bold" fill="#0f172a">FIGURE 1.1: PRINT SPECIFICATION MATRIX</text>
    <rect x="56" y="490" width="688" height="150" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" rx="4" />
    <line x1="56" y1="525" x2="744" y2="525" stroke="#e2e8f0" stroke-width="1" />
    <line x1="56" y1="565" x2="744" y2="565" stroke="#e2e8f0" stroke-width="1" />
    <line x1="56" y1="605" x2="744" y2="605" stroke="#e2e8f0" stroke-width="1" />
    <line x1="260" y1="490" x2="260" y2="640" stroke="#e2e8f0" stroke-width="1" />
    <line x1="480" y1="490" x2="480" y2="640" stroke="#e2e8f0" stroke-width="1" />

    <!-- Table Header -->
    <text x="76" y="512" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="bold" fill="#475569">PARAMETER</text>
    <text x="280" y="512" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="bold" fill="#475569">STANDARD CONFIG</text>
    <text x="500" y="512" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="bold" fill="#475569">RATE / UNIT</text>

    <!-- Table Row 1 -->
    <text x="76" y="548" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" fill="#1e293b">Monochrome (B&W)</text>
    <text x="280" y="548" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" fill="#1e293b">75 GSM White Bond A4</text>
    <text x="500" y="548" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="bold" fill="#16a34a">₹2.00 / page</text>

    <!-- Table Row 2 -->
    <text x="76" y="588" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" fill="#1e293b">Color Laser Print</text>
    <text x="280" y="588" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" fill="#1e293b">100 GSM Glossy Paper</text>
    <text x="500" y="588" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="bold" fill="#16a34a">₹10.00 / page</text>

    <!-- Table Row 3 -->
    <text x="76" y="628" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" fill="#1e293b">Spiral Wire Binding</text>
    <text x="280" y="628" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" fill="#1e293b">Clear OHP Sheet + Black Spine</text>
    <text x="500" y="628" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="bold" fill="#16a34a">₹25.00 / set</text>

    <!-- Paragraph 2 -->
    <text x="56" y="680" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="bold" fill="#0f172a">CHAPTER 2: CAMPUS CASE STUDY & FINDINGS</text>
    <line x1="56" y1="692" x2="744" y2="692" stroke="#0284c7" stroke-width="2" />
    <text x="56" y="725" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" fill="#334155">Students avoid waiting in 30-minute xerox counter queues before semester exams and laboratory</text>
    <text x="56" y="745" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" fill="#334155">submissions. Shopkeepers receive prioritized print tokens directly queued into their browser terminal,</text>
    <text x="56" y="765" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" fill="#334155">preventing counter overcrowding and accidental document mix-ups.</text>

    <!-- Stamp / Footer -->
    <rect x="56" y="810" width="688" height="190" fill="#f0fdf4" stroke="#86efac" stroke-width="1.5" stroke-dasharray="6,4" rx="8" />
    <text x="80" y="845" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="bold" fill="#166534">🔒 SECURITY SEAL & ZERO-TRACE PRIVACY PROTOCOL</text>
    <text x="80" y="875" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" fill="#15803d">This document is rendered securely via SoftPaper In-Memory Execution Sandbox.</text>
    <text x="80" y="895" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" fill="#15803d">Upon shopkeeper print execution, this binary stream is permanently shredded and purged.</text>
    <text x="80" y="920" font-family="monospace" font-size="11" fill="#166534">Hash: 8f9b2c417e90a35d72f104e1bc2a08 • Timestamp: Verified Campus Session</text>
    <text x="80" y="945" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="bold" fill="#047857">Status: Ready for high-resolution print & bind</text>

    <!-- Footer page number -->
    <line x1="56" y1="1040" x2="744" y2="1040" stroke="#cbd5e1" stroke-width="1" />
    <text x="56" y="1065" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" fill="#94a3b8">SoftPaper Smart Print Engine v2.0 • Page 1 of ${pages}</text>
    <text x="640" y="1065" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" fill="#94a3b8">Confidential Print • Auto-Purge</text>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

// Open IndexedDB database
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        db.createObjectStore(STORE_FILES, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Save binary file into IndexedDB
export async function saveFileToDB(file) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const fileId = 'file_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
      const record = {
        id: fileId,
        name: file.name,
        type: file.type || 'application/pdf',
        size: file.size,
        dataUrl: reader.result, // base64 data url for viewing/printing
        createdAt: new Date().toISOString()
      };

      const tx = db.transaction(STORE_FILES, 'readwrite');
      const store = tx.objectStore(STORE_FILES);
      store.put(record);
      tx.oncomplete = () => resolve(record);
      tx.onerror = () => reject(tx.error);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// Retrieve file by ID with graceful fallback for demo items
export async function getFileFromDB(fileId) {
  try {
    const db = await openDB();
    const result = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_FILES, 'readonly');
      const store = tx.objectStore(STORE_FILES);
      const request = store.get(fileId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    if (result) return result;
  } catch (err) {
    console.warn('IndexedDB read fallback:', err);
  }

  // Fallback demo document if record was not found
  return {
    id: fileId,
    name: fileId.includes('demo') ? 'Campus_Notes.pdf' : 'Document.pdf',
    type: 'image/svg+xml',
    size: 204800,
    dataUrl: generateSampleDocumentUrl('Lecture Notes - DBMS Unit 1', 'Campus Tech Institute', 5)
  };
}

// Delete file from IndexedDB permanently (Auto-Shred)
export async function deleteFileFromDB(fileId) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_FILES, 'readwrite');
      const store = tx.objectStore(STORE_FILES);
      const request = store.delete(fileId);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Delete file error:', err);
    return false;
  }
}

// BroadcastChannel for cross-tab synchronization
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('softpaper_channel') : null;
const listeners = new Set();

if (channel) {
  channel.onmessage = (event) => {
    listeners.forEach((fn) => {
      try { fn(event.data); } catch (e) { console.error('Listener error', e); }
    });
  };
}

export function subscribeToSync(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function broadcastEvent(event) {
  if (channel) {
    try { channel.postMessage(event); } catch (e) { console.error('Broadcast error', e); }
  }
  listeners.forEach((fn) => {
    try { fn(event); } catch (e) { console.error('Listener error', e); }
  });
}

// Rich Web Audio API Synthesizer (No external audio file dependencies)
export function playNotificationSound(type = 'new_order') {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    if (type === 'shred') {
      // Paper Shredding Digital Sweep Sound
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.35);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
      return;
    }

    if (type === 'status_update') {
      // Gentle Ding Ping
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.5, now); // C6
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
      return;
    }

    // Default: Cheerful Double Chime (A5 -> D6)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now); // A5
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.45);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1174.66, now + 0.12); // D6
    gain2.gain.setValueAtTime(0.2, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.65);
  } catch (e) {
    console.log('Audio chime not permitted without user gesture', e);
  }
}

// Default Seed Data
const DEFAULT_SHOPS = [
  {
    id: 'SHARMA-01',
    name: 'Sharma Stationers',
    rating: '4.8',
    color: 'from-orange-500 to-amber-500',
    isOpen: true,
    timings: '9:00 AM - 9:00 PM',
    distance: '150m Away',
    bwPrice: 2,
    bwDoublePrice: 1.5,
    colorPrice: 10,
    spiralPrice: 25,
    email: 'sharma@softpaper.com',
    password: 'password123',
    upiId: 'sharma.prints@okhdfcbank',
    phone: '+91 98123 45678',
    address: 'Shop #4, College Gate Market'
  },
  {
    id: 'GUPTA-02',
    name: 'Gupta Prints',
    rating: '4.5',
    color: 'from-emerald-400 to-teal-500',
    isOpen: true,
    timings: '10:00 AM - 8:00 PM',
    distance: '200m Away',
    bwPrice: 2,
    bwDoublePrice: 1.5,
    colorPrice: 8,
    spiralPrice: 20,
    email: 'gupta@softpaper.com',
    password: 'password123',
    upiId: 'guptaprint@upi',
    phone: '+91 98234 56789',
    address: 'Near Central Library'
  },
  {
    id: 'APEX-03',
    name: 'Apex Xerox',
    rating: '4.2',
    color: 'from-blue-500 to-indigo-500',
    isOpen: true,
    timings: '8:00 AM - 10:00 PM',
    distance: '350m Away',
    bwPrice: 1.5,
    bwDoublePrice: 1.2,
    colorPrice: 10,
    spiralPrice: 25,
    email: 'apex@softpaper.com',
    password: 'password123',
    upiId: 'apex.xerox@axl',
    phone: '+91 98345 67890',
    address: 'Block B, Tech Park'
  },
  {
    id: 'CAMPUS-04',
    name: 'Campus Print Hub',
    rating: '4.9',
    color: 'from-purple-500 to-pink-500',
    isOpen: true,
    timings: '8:00 AM - 11:00 PM',
    distance: '600m Away',
    bwPrice: 2,
    bwDoublePrice: 1.5,
    colorPrice: 12,
    spiralPrice: 30,
    email: 'campus@softpaper.com',
    password: 'password123',
    upiId: 'campusprint@icici',
    phone: '+91 98456 78901',
    address: 'Student Activity Center'
  },
  {
    id: 'VERMA-05',
    name: 'Verma Xerox',
    rating: '4.3',
    color: 'from-amber-500 to-red-500',
    isOpen: false,
    timings: 'Closed',
    distance: '450m Away',
    bwPrice: 2,
    bwDoublePrice: 1.5,
    colorPrice: 10,
    spiralPrice: 25,
    email: 'verma@softpaper.com',
    password: 'password123',
    upiId: 'verma@upi',
    phone: '+91 98567 89012',
    address: 'Gate 2 Commercial Complex'
  }
];

const sampleDoc1 = generateSampleDocumentUrl('DBMS Lecture Notes Unit-1', 'Relational Models & SQL Queries', 20);
const sampleDoc2 = generateSampleDocumentUrl('Microprocessor Lab Manual v2', '8086 Assembly Language Programs', 15);
const sampleDoc3 = generateSampleDocumentUrl('Cloud Architecture Presentation', 'Microservices & Containerization', 5);

const DEFAULT_ORDERS = [
  {
    _id: 'ord_demo_1',
    tokenId: 'SP-108',
    shopId: 'SHARMA-01',
    shopName: 'Sharma Stationers',
    customerName: 'Abhishek',
    customerPhone: '+91 98765 43210',
    pages: 20,
    quantity: 1,
    amount: 40,
    printSides: 'single', // 'single' or 'double'
    finishing: 'stapled', // 'none', 'stapled', 'spiral'
    notes: 'Please staple on top-left corner',
    allowView: true,
    paymentMethod: 'Pay Later',
    paymentStatus: 'Pending',
    printType: 'B&W',
    status: 'completed',
    filesShredded: true,
    shreddedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    files: [
      { id: 'f_demo_1', name: 'DBMS_Notes_Unit1.pdf', size: 1048576, type: 'image/svg+xml', dataUrl: sampleDoc1, shredded: true }
    ]
  },
  {
    _id: 'ord_demo_2',
    tokenId: 'SP-109',
    shopId: 'SHARMA-01',
    shopName: 'Sharma Stationers',
    customerName: 'Priya Verma',
    customerPhone: '+91 98222 11111',
    pages: 15,
    quantity: 1,
    amount: 30,
    printSides: 'double',
    finishing: 'none',
    notes: 'Standard front & back print',
    allowView: false,
    paymentMethod: 'Pay Now',
    paymentStatus: 'Paid',
    printType: 'B&W',
    status: 'ready',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    files: [
      { id: 'f_demo_2', name: 'Lab_Manual_v2.pdf', size: 524288, type: 'image/svg+xml', dataUrl: sampleDoc2 }
    ]
  },
  {
    _id: 'ord_demo_3',
    tokenId: 'SP-110',
    shopId: 'SHARMA-01',
    shopName: 'Sharma Stationers',
    customerName: 'Abhishek',
    customerPhone: '+91 98765 43210',
    pages: 5,
    quantity: 2,
    amount: 100,
    printSides: 'single',
    finishing: 'spiral',
    notes: 'Spiral bind with front clear sheet',
    allowView: true,
    paymentMethod: 'Pay Now',
    paymentStatus: 'Paid',
    printType: 'Color',
    status: 'pending',
    createdAt: new Date(Date.now() - 400000).toISOString(),
    files: [
      { id: 'f_demo_3', name: 'Assignment_Presentation.pdf', size: 2097152, type: 'image/svg+xml', dataUrl: sampleDoc3 }
    ]
  }
];

export function getShops() {
  const saved = localStorage.getItem('softpaper_shops');
  if (saved) {
    try { return JSON.parse(saved); } catch (e) { console.error(e); }
  }
  localStorage.setItem('softpaper_shops', JSON.stringify(DEFAULT_SHOPS));
  return DEFAULT_SHOPS;
}

export function saveShops(shops) {
  localStorage.setItem('softpaper_shops', JSON.stringify(shops));
  broadcastEvent({ type: 'SHOPS_UPDATED', shops });
}

export function getShopById(id) {
  const shops = getShops();
  return shops.find(s => s.id === id || s.name.toLowerCase() === id?.toLowerCase()) || shops[0];
}

export function updateShopDetails(updated) {
  const shops = getShops();
  const idx = shops.findIndex(s => s.id === updated.id);
  if (idx !== -1) {
    shops[idx] = { ...shops[idx], ...updated };
  } else {
    shops.push(updated);
  }
  saveShops(shops);
  return shops[idx !== -1 ? idx : shops.length - 1];
}

export function getOrders() {
  const saved = localStorage.getItem('softpaper_orders');
  if (saved) {
    try { return JSON.parse(saved); } catch (e) { console.error(e); }
  }
  localStorage.setItem('softpaper_orders', JSON.stringify(DEFAULT_ORDERS));
  return DEFAULT_ORDERS;
}

export function saveOrders(orders) {
  localStorage.setItem('softpaper_orders', JSON.stringify(orders));
}

export async function createOrder(orderPayload, files) {
  // Save uploaded files to IndexedDB
  const fileRecords = [];
  if (files && files.length > 0) {
    for (const f of files) {
      if (f instanceof File || f instanceof Blob) {
        const record = await saveFileToDB(f);
        fileRecords.push({
          id: record.id,
          name: record.name,
          size: record.size,
          type: record.type,
          dataUrl: record.dataUrl
        });
      } else if (f.dataUrl) {
        fileRecords.push(f);
      } else {
        fileRecords.push({
          id: f.id || 'f_' + Date.now(),
          name: f.name || 'Document.pdf',
          size: f.size || 204800,
          type: f.type || 'image/svg+xml',
          dataUrl: generateSampleDocumentUrl(f.name || 'Uploaded Document', orderPayload.shopName || 'SoftPaper Shop', orderPayload.pages || 1)
        });
      }
    }
  } else {
    // If no raw file attached, synthesize a valid previewable sample document
    const sampleUrl = generateSampleDocumentUrl('Quick Print Document', orderPayload.shopName || 'SoftPaper Print', orderPayload.pages || 5);
    fileRecords.push({
      id: 'f_synth_' + Date.now(),
      name: 'Document_' + (orderPayload.printType || 'B&W') + '.pdf',
      size: 350000,
      type: 'image/svg+xml',
      dataUrl: sampleUrl
    });
  }

  // Generate realistic memorable token: e.g. SP-482
  const tokenNum = Math.floor(100 + Math.random() * 900);
  const tokenId = `SP-${tokenNum}`;
  const orderId = 'ord_' + Date.now();

  const newOrder = {
    _id: orderId,
    tokenId,
    shopId: orderPayload.shopId || 'SHARMA-01',
    shopName: orderPayload.shopName || 'Sharma Stationers',
    customerName: orderPayload.customerName || 'Abhishek',
    customerPhone: orderPayload.customerPhone || '+91 98765 43210',
    pages: Number(orderPayload.pages) || 1,
    quantity: Number(orderPayload.quantity) || 1,
    amount: Number(orderPayload.amount) || 0,
    printSides: orderPayload.printSides || 'single', // 'single' or 'double'
    finishing: orderPayload.finishing || 'none', // 'none', 'stapled', 'spiral'
    notes: orderPayload.notes || '',
    allowView: Boolean(orderPayload.allowView),
    paymentMethod: orderPayload.paymentMethod || 'Pay Later',
    paymentStatus: orderPayload.paymentMethod === 'Pay Now' ? 'Paid' : 'Pending',
    printType: orderPayload.printType || 'B&W',
    status: 'pending',
    createdAt: new Date().toISOString(),
    files: fileRecords
  };

  const orders = getOrders();
  orders.unshift(newOrder);
  saveOrders(orders);

  // Broadcast to other tabs & play notification
  broadcastEvent({ type: 'NEW_ORDER', order: newOrder });
  playNotificationSound('new_order');

  return { success: true, order: newOrder };
}

// Generate an instant demo order for fast testing
export function generateDemoOrder(shopId = 'SHARMA-01') {
  const shop = getShopById(shopId);
  const sampleTitles = [
    { title: 'Operating Systems Lab Assignment', subtitle: 'Process Scheduling & Memory Virtualization', pages: 8 },
    { title: 'Computer Networks Project Report', subtitle: 'TCP/IP Handshake & Socket Programming', pages: 12 },
    { title: 'AI & Neural Networks Course Pack', subtitle: 'Backpropagation & Loss Optimization', pages: 6 }
  ];
  const chosen = sampleTitles[Math.floor(Math.random() * sampleTitles.length)];
  const tokenNum = Math.floor(100 + Math.random() * 900);
  const tokenId = `SP-${tokenNum}`;
  const orderId = 'ord_' + Date.now();
  const sampleDoc = generateSampleDocumentUrl(chosen.title, chosen.subtitle, chosen.pages);

  const demoOrder = {
    _id: orderId,
    tokenId,
    shopId: shop.id,
    shopName: shop.name,
    customerName: 'Campus Student',
    customerPhone: '+91 98765 00000',
    pages: chosen.pages,
    quantity: 1,
    amount: chosen.pages * shop.bwPrice,
    printSides: 'single',
    finishing: 'stapled',
    notes: 'Corner stapled please',
    allowView: true,
    paymentMethod: 'Pay Now',
    paymentStatus: 'Paid',
    printType: 'B&W',
    status: 'pending',
    createdAt: new Date().toISOString(),
    files: [
      {
        id: 'f_' + Date.now(),
        name: chosen.title.replace(/\s+/g, '_') + '.pdf',
        size: 512000,
        type: 'image/svg+xml',
        dataUrl: sampleDoc
      }
    ]
  };

  const orders = getOrders();
  orders.unshift(demoOrder);
  saveOrders(orders);

  broadcastEvent({ type: 'NEW_ORDER', order: demoOrder });
  playNotificationSound('new_order');

  return demoOrder;
}

// Cancel an order
export function cancelOrder(orderId) {
  const orders = getOrders();
  const idx = orders.findIndex(o => o._id === orderId);
  if (idx !== -1) {
    orders[idx].status = 'cancelled';
    orders[idx].updatedAt = new Date().toISOString();
    saveOrders(orders);
    broadcastEvent({ type: 'ORDER_UPDATED', order: orders[idx] });
    return { success: true, order: orders[idx] };
  }
  return { success: false, message: 'Order not found' };
}

// Permanently Shred and Purge Order Documents from Memory and Storage
export async function shredOrderDocuments(orderId) {
  const orders = getOrders();
  const idx = orders.findIndex(o => o._id === orderId);
  if (idx !== -1) {
    const order = orders[idx];
    if (order.files && order.files.length > 0) {
      for (const f of order.files) {
        if (f.id) {
          await deleteFileFromDB(f.id);
        }
      }
    }

    const shreddedTime = new Date().toISOString();
    order.filesShredded = true;
    order.shreddedAt = shreddedTime;
    // Wipe all binary data URLs permanently
    order.files = (order.files || []).map(f => ({
      id: f.id,
      name: f.name,
      size: f.size,
      type: f.type,
      shredded: true
    }));

    orders[idx] = order;
    saveOrders(orders);

    playNotificationSound('shred');
    broadcastEvent({ 
      type: 'DOCUMENT_SHREDDED', 
      orderId: order._id, 
      tokenId: order.tokenId,
      shopName: order.shopName,
      customerName: order.customerName,
      shreddedAt: shreddedTime
    });

    return { success: true, order };
  }
  return { success: false, message: 'Order not found' };
}

export async function updateOrderStatus(orderId, newStatus) {
  const orders = getOrders();
  const idx = orders.findIndex(o => o._id === orderId);
  if (idx !== -1) {
    orders[idx].status = newStatus;
    orders[idx].updatedAt = new Date().toISOString();
    
    // Automatic Destruction on Completion
    if (newStatus === 'completed') {
      saveOrders(orders);
      await shredOrderDocuments(orderId);
      return { success: true, order: getOrders().find(o => o._id === orderId) };
    }

    saveOrders(orders);
    playNotificationSound('status_update');
    broadcastEvent({ type: 'ORDER_UPDATED', order: orders[idx] });
    return { success: true, order: orders[idx] };
  }
  return { success: false, message: 'Order not found' };
}

// User Profile
export function getUserProfile() {
  const saved = localStorage.getItem('softpaper_user_profile');
  if (saved) {
    try { return JSON.parse(saved); } catch (e) { console.error(e); }
  }
  const defaultUser = {
    name: 'Abhishek Sharma',
    email: 'abhishek.s@campus.edu',
    phone: '+91 98765 43210',
    studentId: 'ST-2024-8841',
    college: 'Campus Tech Institute',
    defaultPrintType: 'B&W',
    soundEnabled: true
  };
  localStorage.setItem('softpaper_user_profile', JSON.stringify(defaultUser));
  return defaultUser;
}

export function saveUserProfile(profile) {
  localStorage.setItem('softpaper_user_profile', JSON.stringify(profile));
  broadcastEvent({ type: 'USER_PROFILE_UPDATED', profile });
}
