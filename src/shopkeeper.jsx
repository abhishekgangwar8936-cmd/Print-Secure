import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
    Store, RefreshCcw, Printer,
    Clock, ChevronLeft, Loader2, Eye, Lock, ShieldAlert, 
    RotateCw, Crop, Settings, Save, IndianRupee,
    Sparkles, ArrowRight, Contrast, Maximize,
    AlertTriangle, ShieldCheck, Search, Volume2, VolumeX,
    QrCode, X, Check, Phone, FileText, Move, Scissors
} from 'lucide-react';
import { PDFDocument, PageSizes } from 'pdf-lib';
import { api } from './services/api';
import { 
    getFileFromDB, subscribeToSync, playNotificationSound, 
    getShops, getOrders, updateOrderStatus, shredOrderDocuments,
    generateDemoOrder, generateSampleDocumentUrl 
} from './services/storageService';

export default function Shopkeeper() {
    // AUTH STATE
    const [token, setToken] = useState(() => sessionStorage.getItem('shopToken'));
    const [authMode, setAuthMode] = useState('login'); 
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [shopName, setShopName] = useState('');
    const [authError, setAuthError] = useState('');

    const [activeTab, setActiveTab] = useState('dashboard'); 
    const [searchQuery, setSearchQuery] = useState('');
    const [orderFilter, setOrderFilter] = useState('all'); // 'all', 'pending', 'printing', 'ready', 'completed'
    const [showCounterQrModal, setShowCounterQrModal] = useState(false);
    const [isSoundMuted, setIsSoundMuted] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);

    // Shop Details
    const [shopDetails, setShopDetails] = useState(() => {
        const saved = localStorage.getItem('shopDetails');
        if (saved) {
            try { return JSON.parse(saved); } catch {}
        }
        return { 
            name: 'Sharma Stationers', 
            id: 'SHARMA-01', 
            bwPrice: 2, 
            colorPrice: 10,
            upiId: 'sharma.prints@okhdfcbank',
            timings: '9:00 AM - 9:00 PM'
        };
    });
    
    const [savedMessage, setSavedMessage] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isShieldActive, setIsShieldActive] = useState(false);
    const [shieldReason, setShieldReason] = useState('Screen capture or window switch was detected.');
    const [printingOrderId, setPrintingOrderId] = useState(null); 
    const [shredNotification, setShredNotification] = useState(null);

    // Secure Viewer & Edit States
    const [viewOrder, setViewOrder] = useState(null);
    const [currentFileIdx, setCurrentFileIdx] = useState(0);
    const [activeEditTool, setActiveEditTool] = useState('adjust'); // 'adjust', 'crop', 'size'
    const [rotation, setRotation] = useState(0);
    const [scale, setScale] = useState(1);
    const [cropBounds, setCropBounds] = useState({ top: 0, right: 0, bottom: 0, left: 0 });
    const [cropAspectMode, setCropAspectMode] = useState('free'); // 'free' (unrestricted custom crop), '1:1', 'a4', 'passport'
    const [cropPreviewMode, setCropPreviewMode] = useState(false); // false = edit handles, true = view clipped output
    const [dragInfo, setDragInfo] = useState(null);
    const cropContainerRef = useRef(null);
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [bwEnhance, setBwEnhance] = useState(false);
    const [invertColors, setInvertColors] = useState(false);
    const [pageSize, setPageSize] = useState('A4');
    const [marginSize, setMarginSize] = useState('5mm');
    const [resolvedFileDataUrl, setResolvedFileDataUrl] = useState(null);

    // Apply crop preset (A4, 1:1, Passport, or Freeform)
    const applyCropPreset = (mode) => {
        setCropAspectMode(mode);
        if (mode === 'free') {
            return; // Freeform custom: keep existing bounds, allows free dragging without aspect lock
        }
        
        let targetRatio = 1;
        if (mode === 'a4') targetRatio = 1 / 1.414;
        else if (mode === 'passport') targetRatio = 3.5 / 4.5;
        else if (mode === '1:1') targetRatio = 1;

        const rect = cropContainerRef.current?.getBoundingClientRect();
        const imgAspect = rect && rect.height > 0 ? rect.width / rect.height : 0.75;
        const targetPercentRatio = targetRatio / imgAspect;

        let boxWidth = 70;
        let boxHeight = boxWidth / targetPercentRatio;

        if (boxHeight > 85) {
            boxHeight = 85;
            boxWidth = boxHeight * targetPercentRatio;
        }

        const left = Math.max(0, Math.round((100 - boxWidth) / 2));
        const right = left;
        const top = Math.max(0, Math.round((100 - boxHeight) / 2));
        const bottom = top;

        setCropBounds({ top, right, bottom, left });
    };

    // Freeform Interactive Crop Box Drag Handler
    const startCropDrag = (e, handleType) => {
        e.preventDefault();
        e.stopPropagation();
        if (!cropContainerRef.current) return;
        const rect = cropContainerRef.current.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        setDragInfo({
            handleType,
            startX: clientX,
            startY: clientY,
            initialBounds: { ...cropBounds },
            rect: { width: rect.width, height: rect.height }
        });
    };

    useEffect(() => {
        if (!dragInfo) return;

        const handlePointerMove = (e) => {
            if (e.cancelable && e.type === 'touchmove') e.preventDefault();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            const deltaX = ((clientX - dragInfo.startX) / (dragInfo.rect.width || 1)) * 100;
            const deltaY = ((clientY - dragInfo.startY) / (dragInfo.rect.height || 1)) * 100;

            const { handleType, initialBounds } = dragInfo;
            const MIN_SIZE = 4; // minimum % width or height so crop box stays selectable

            let newTop = initialBounds.top;
            let newBottom = initialBounds.bottom;
            let newLeft = initialBounds.left;
            let newRight = initialBounds.right;

            if (handleType === 'move') {
                const boxWidth = 100 - initialBounds.left - initialBounds.right;
                const boxHeight = 100 - initialBounds.top - initialBounds.bottom;

                let proposedLeft = initialBounds.left + deltaX;
                let proposedTop = initialBounds.top + deltaY;

                proposedLeft = Math.max(0, Math.min(proposedLeft, 100 - boxWidth));
                proposedTop = Math.max(0, Math.min(proposedTop, 100 - boxHeight));

                newLeft = Math.round(proposedLeft * 10) / 10;
                newRight = Math.round((100 - proposedLeft - boxWidth) * 10) / 10;
                newTop = Math.round(proposedTop * 10) / 10;
                newBottom = Math.round((100 - proposedTop - boxHeight) * 10) / 10;
            } else {
                // Freeform Unrestricted Resize on edges and corners
                if (handleType.includes('w')) {
                    const maxLeft = 100 - initialBounds.right - MIN_SIZE;
                    newLeft = Math.max(0, Math.min(initialBounds.left + deltaX, maxLeft));
                    newLeft = Math.round(newLeft * 10) / 10;
                }
                if (handleType.includes('e')) {
                    const maxRight = 100 - initialBounds.left - MIN_SIZE;
                    newRight = Math.max(0, Math.min(initialBounds.right - deltaX, maxRight));
                    newRight = Math.round(newRight * 10) / 10;
                }
                if (handleType.includes('n')) {
                    const maxTop = 100 - initialBounds.bottom - MIN_SIZE;
                    newTop = Math.max(0, Math.min(initialBounds.top + deltaY, maxTop));
                    newTop = Math.round(newTop * 10) / 10;
                }
                if (handleType.includes('s')) {
                    const maxBottom = 100 - initialBounds.top - MIN_SIZE;
                    newBottom = Math.max(0, Math.min(initialBounds.bottom - deltaY, maxBottom));
                    newBottom = Math.round(newBottom * 10) / 10;
                }

                // If non-free aspect ratio is active
                if (cropAspectMode !== 'free' && dragInfo.rect.width > 0 && dragInfo.rect.height > 0) {
                    let targetRatio = 1;
                    if (cropAspectMode === 'a4') targetRatio = 1 / 1.414;
                    if (cropAspectMode === 'passport') targetRatio = 3.5 / 4.5;
                    if (cropAspectMode === '1:1') targetRatio = 1;

                    const imgAspect = dragInfo.rect.width / dragInfo.rect.height;
                    const targetPercentRatio = targetRatio / imgAspect;

                    const currentWidth = 100 - newLeft - newRight;
                    const currentHeight = 100 - newTop - newBottom;

                    if (handleType.includes('e') || handleType.includes('w')) {
                        const reqHeight = currentWidth / targetPercentRatio;
                        const diffH = reqHeight - currentHeight;
                        if (newBottom - diffH >= 0) newBottom = Math.max(0, newBottom - diffH);
                        else if (newTop - diffH >= 0) newTop = Math.max(0, newTop - diffH);
                    } else if (handleType.includes('n') || handleType.includes('s')) {
                        const reqWidth = currentHeight * targetPercentRatio;
                        const diffW = reqWidth - currentWidth;
                        if (newRight - diffW >= 0) newRight = Math.max(0, newRight - diffW);
                        else if (newLeft - diffW >= 0) newLeft = Math.max(0, newLeft - diffW);
                    }
                }
            }

            setCropBounds({
                top: Math.max(0, Math.min(95, newTop)),
                right: Math.max(0, Math.min(95, newRight)),
                bottom: Math.max(0, Math.min(95, newBottom)),
                left: Math.max(0, Math.min(95, newLeft))
            });
        };

        const handlePointerUp = () => {
            setDragInfo(null);
        };

        window.addEventListener('mousemove', handlePointerMove);
        window.addEventListener('mouseup', handlePointerUp);
        window.addEventListener('touchmove', handlePointerMove, { passive: false });
        window.addEventListener('touchend', handlePointerUp);

        return () => {
            window.removeEventListener('mousemove', handlePointerMove);
            window.removeEventListener('mouseup', handlePointerUp);
            window.removeEventListener('touchmove', handlePointerMove);
            window.removeEventListener('touchend', handlePointerUp);
        };
    }, [dragInfo, cropAspectMode]);

    // Live Security Clock for Watermark
    const [securityTimestamp, setSecurityTimestamp] = useState(() => new Date().toLocaleTimeString());
    useEffect(() => {
        const timer = setInterval(() => {
            setSecurityTimestamp(new Date().toLocaleTimeString());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Aggressive Anti-Screenshot & Screen Capture Detection
    useEffect(() => {
        if (!token) return;

        const handleContextMenu = (e) => {
            e.preventDefault();
            return false;
        };

        const handleKeyDown = (e) => {
            // Block PrintScreen
            if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
                e.preventDefault();
                e.stopPropagation();
                try {
                    navigator.clipboard.writeText("⚠️ SECURITY ALERT: Screenshots and screen recording are disabled on SoftPaper to protect customer privacy.");
                } catch {}
                setShieldReason("PrintScreen attempt detected! Display blackout activated.");
                setIsShieldActive(true);
                return;
            }

            // Block Windows Snipping Tool (Win+Shift+S, Ctrl+Shift+S)
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'S' || e.key === 's')) {
                e.preventDefault();
                e.stopPropagation();
                setShieldReason("Snipping tool shortcut detected! Display blocked.");
                setIsShieldActive(true);
                return;
            }

            // Block Browser Save as PDF / Save Page / DevTools
            if (
                ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S' || e.key === 'p' || e.key === 'P' || e.key === 'u' || e.key === 'U')) ||
                e.key === 'F12' ||
                ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'C' || e.key === 'c' || e.key === 'J' || e.key === 'j'))
            ) {
                e.preventDefault();
                e.stopPropagation();
                setShieldReason("Shortcut to inspect or save page blocked.");
                setIsShieldActive(true);
                return;
            }
        };

        // Window Defocus / Blur detection (triggered when external screen-grabbers, Snipping Tool, or OBS are clicked)
        const handleBlur = () => {
            if (viewOrder) {
                setShieldReason("Window lost focus! Screen capture shield active.");
                setIsShieldActive(true);
            }
        };

        const handleFocus = () => {
            // Leave shield active until user explicitly clicks "Resume Session"
        };

        document.addEventListener('contextmenu', handleContextMenu);
        window.addEventListener('keydown', handleKeyDown, true);
        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);

        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
            window.removeEventListener('keydown', handleKeyDown, true);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
        };
    }, [token, viewOrder]);

    const fetchOrders = async () => {
        if (activeTab === 'settings') return;
        setIsRefreshing(true);
        try {
            const data = await api.getOrders(shopDetails?.id);
            setOrders(data || []);
        } catch (error) {
            console.error("Fetch orders error:", error);
            setOrders(getOrders());
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    // Real-time synchronization
    useEffect(() => {
        if (!token) return;
        let isMounted = true;
        api.getOrders(shopDetails?.id).then((data) => {
            if (isMounted) {
                setOrders(data || []);
                setIsLoading(false);
            }
        }).catch(() => {
            if (isMounted) {
                setOrders(getOrders());
                setIsLoading(false);
            }
        });

        const unsubscribe = subscribeToSync((event) => {
            if (event.type === 'NEW_ORDER') {
                if (!isSoundMuted) playNotificationSound('new_order');
                setOrders(prev => [event.order, ...prev.filter(o => o._id !== event.order._id)]);
            } else if (event.type === 'ORDER_UPDATED') {
                setOrders(prev => prev.map(o => o._id === event.order._id ? event.order : o));
            } else if (event.type === 'DOCUMENT_SHREDDED') {
                setOrders(prev => prev.map(o => o._id === event.orderId ? { ...o, filesShredded: true, status: 'completed' } : o));
            }
        });

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, [token, shopDetails?.id, isSoundMuted]);

    // Resolve file content when viewOrder opens or changes
    useEffect(() => {
        let isMounted = true;
        async function resolveFile() {
            if (!viewOrder || !viewOrder.files || !viewOrder.files[currentFileIdx]) {
                setResolvedFileDataUrl(null);
                return;
            }
            const fileItem = viewOrder.files[currentFileIdx];
            if (fileItem.shredded) {
                setResolvedFileDataUrl(null);
                return;
            }
            if (fileItem.dataUrl) {
                setResolvedFileDataUrl(fileItem.dataUrl);
            } else if (fileItem.id) {
                const dbRecord = await getFileFromDB(fileItem.id);
                if (isMounted && dbRecord?.dataUrl) {
                    setResolvedFileDataUrl(dbRecord.dataUrl);
                } else if (isMounted) {
                    setResolvedFileDataUrl(generateSampleDocumentUrl(fileItem.name || 'Order Document', viewOrder.shopName, viewOrder.pages || 1));
                }
            } else if (isMounted) {
                setResolvedFileDataUrl(generateSampleDocumentUrl(fileItem.name || 'Order Document', viewOrder.shopName, viewOrder.pages || 1));
            }
        }
        resolveFile();
        return () => { isMounted = false; };
    }, [viewOrder, currentFileIdx]);

    const handleUpdateStatus = async (orderId, newStatus) => {
        try {
            const res = await api.updateOrderStatus(orderId, newStatus);
            if (res.order) {
                setOrders(prev => prev.map(o => o._id === orderId ? res.order : o));
            }
            if (newStatus === 'completed') {
                triggerShredNotification(orderId);
            }
        } catch {
            updateOrderStatus(orderId, newStatus);
            setOrders(getOrders());
        }
    };

    const triggerShredNotification = (orderId) => {
        const found = orders.find(o => o._id === orderId);
        setShredNotification(`Document for Token #${found?.tokenId || 'order'} was printed and permanently shredded from memory!`);
        setTimeout(() => setShredNotification(null), 4000);
    };

    // AUTO-SHRED ON PRINT EXECUTION
    const executeAutoShredAfterPrint = async (orderId) => {
        try {
            await shredOrderDocuments(orderId);
            await api.updateOrderStatus(orderId, 'completed');
            setOrders(getOrders());
            triggerShredNotification(orderId);
            if (viewOrder?._id === orderId) {
                closeViewer();
            }
        } catch (e) {
            console.error('Auto shred error:', e);
        }
    };

    // BULK PRINT (Merges all order files, executes print, then AUTO-SHREDS!)
    const handleBulkPrint = async (order) => {
        if (order.filesShredded) {
            alert('This document was already printed and shredded for privacy.');
            return;
        }

        setPrintingOrderId(order._id);
        try {
            const mergedPdf = await PDFDocument.create();

            for (const fileItem of order.files) {
                let dataUrl = fileItem.dataUrl;
                if (!dataUrl && fileItem.id) {
                    const record = await getFileFromDB(fileItem.id);
                    if (record) dataUrl = record.dataUrl;
                }

                if (!dataUrl) continue;

                const res = await fetch(dataUrl);
                const arrayBuffer = await res.arrayBuffer();
                const isImage = (fileItem.type && fileItem.type.startsWith('image/')) || 
                                (fileItem.name && fileItem.name.match(/\.(jpeg|jpg|png)$/i));

                if (isImage) {
                    const isPng = fileItem.type === 'image/png' || fileItem.name?.endsWith('.png');
                    const image = isPng 
                        ? await mergedPdf.embedPng(arrayBuffer) 
                        : await mergedPdf.embedJpg(arrayBuffer);
                    
                    const imgDims = image.scale(1);
                    const page = mergedPdf.addPage(PageSizes.A4);
                    const pageWidth = page.getWidth();
                    const pageHeight = page.getHeight();

                    const margin = marginSize === '10mm' ? 28 : marginSize === '5mm' ? 14 : 4;
                    const scaleFactor = Math.min((pageWidth - (margin * 2)) / imgDims.width, (pageHeight - (margin * 2)) / imgDims.height);
                    const drawWidth = imgDims.width * scaleFactor;
                    const drawHeight = imgDims.height * scaleFactor;

                    page.drawImage(image, {
                        x: (pageWidth - drawWidth) / 2,
                        y: (pageHeight - drawHeight) / 2,
                        width: drawWidth,
                        height: drawHeight,
                    });
                } else {
                    try {
                        const pdf = await PDFDocument.load(arrayBuffer);
                        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                        copiedPages.forEach((page) => mergedPdf.addPage(page));
                    } catch (e) {
                        console.error('PDF page load error during bulk print:', e);
                    }
                }
            }

            const mergedPdfBytes = await mergedPdf.save();
            const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
            const localBlobUrl = URL.createObjectURL(blob);

            const printWindow = document.createElement('iframe');
            printWindow.style.position = 'fixed';
            printWindow.style.right = '0';
            printWindow.style.bottom = '0';
            printWindow.style.width = '0';
            printWindow.style.height = '0';
            printWindow.style.border = '0';
            printWindow.src = localBlobUrl;
            document.body.appendChild(printWindow);

            printWindow.onload = () => {
                try {
                    printWindow.contentWindow.focus();
                    printWindow.contentWindow.print();
                } catch {
                    window.open(localBlobUrl, '_blank')?.print(); 
                }

                // Immediately auto-destroy and revoke after print trigger
                setTimeout(async () => {
                    try { document.body.removeChild(printWindow); } catch {}
                    URL.revokeObjectURL(localBlobUrl);
                    setPrintingOrderId(null);
                    await executeAutoShredAfterPrint(order._id);
                }, 2000);
            };
        } catch (error) {
            console.error('Printing failed:', error);
            alert("Could not process document for print.");
            setPrintingOrderId(null);
        }
    };

    // PRINT FROM VIEWER WITH EDITING/FILTERS APPLIED + AUTO SHRED
    const handleViewerPrintWithEdits = async () => {
        if (!viewOrder || !resolvedFileDataUrl) return;
        setPrintingOrderId(viewOrder._id);

        try {
            const printWindow = document.createElement('iframe');
            printWindow.style.position = 'fixed';
            printWindow.style.right = '0';
            printWindow.style.bottom = '0';
            printWindow.style.width = '0';
            printWindow.style.height = '0';
            printWindow.style.border = '0';

            // Construct styled printable HTML with custom contrast, brightness, rotation & crop
            const filterCss = `
                filter: contrast(${bwEnhance ? 220 : contrast}%) brightness(${brightness}%) ${bwEnhance ? 'grayscale(100%)' : ''} ${invertColors ? 'invert(100%)' : ''};
                transform: rotate(${rotation}deg) scale(${scale});
                clip-path: inset(${cropBounds.top}% ${cropBounds.right}% ${cropBounds.bottom}% ${cropBounds.left}%);
                max-width: 96%;
                max-height: 96vh;
                margin: auto;
                display: block;
            `;

            printWindow.srcdoc = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Physical Print - Token ${viewOrder.tokenId}</title>
                    <style>
                        @page { size: ${pageSize.toLowerCase()}; margin: ${marginSize}; }
                        body { margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #fff; }
                        img, iframe { ${filterCss} }
                    </style>
                </head>
                <body>
                    <img src="${resolvedFileDataUrl}" onload="window.print();" />
                </body>
                </html>
            `;

            document.body.appendChild(printWindow);

            setTimeout(async () => {
                try { document.body.removeChild(printWindow); } catch {}
                setPrintingOrderId(null);
                await executeAutoShredAfterPrint(viewOrder._id);
            }, 3000);

        } catch (err) {
            console.error('Viewer print error:', err);
            setPrintingOrderId(null);
        }
    };

    const closeViewer = () => {
        setViewOrder(null); 
        setCurrentFileIdx(0); 
        setRotation(0); 
        setScale(1); 
        setCropBounds({ top: 0, right: 0, bottom: 0, left: 0 });
        setCropAspectMode('free');
        setCropPreviewMode(false);
        setDragInfo(null);
        setBrightness(100);
        setContrast(100);
        setBwEnhance(false);
        setInvertColors(false);
        setResolvedFileDataUrl(null);
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        try {
            let res;
            if (authMode === 'login') {
                res = await api.shopLogin(email, password);
            } else {
                res = await api.shopRegister({ email, password, name: shopName });
            }

            if (res.success) {
                sessionStorage.setItem('shopToken', res.token);
                setToken(res.token);
                
                const details = {
                    name: res.shop.name || 'My Print Shop',
                    id: res.shop.id || res.shop.shopId,
                    bwPrice: res.shop.bwPrice || 2,
                    colorPrice: res.shop.colorPrice || 10,
                    upiId: res.shop.upiId || 'shop@upi',
                    timings: res.shop.timings || '9:00 AM - 9:00 PM'
                };
                setShopDetails(details);
                localStorage.setItem('shopDetails', JSON.stringify(details));
            } else {
                setAuthError(res.message || 'Authentication failed');
                setTimeout(() => setAuthError(''), 4000);
            }
        } catch { 
            setAuthError("Network or storage error"); 
        }
    };

    const handleQuickDemoLogin = (shopKey = 'sharma') => {
        const shops = getShops();
        const picked = shopKey === 'gupta' ? shops[1] : shops[0];
        const tokenVal = 'token_' + picked.id + '_' + Date.now();
        sessionStorage.setItem('shopToken', tokenVal);
        setToken(tokenVal);
        const details = {
            name: picked.name,
            id: picked.id,
            bwPrice: picked.bwPrice,
            colorPrice: picked.colorPrice,
            upiId: picked.upiId || 'shop@upi',
            timings: picked.timings
        };
        setShopDetails(details);
        localStorage.setItem('shopDetails', JSON.stringify(details));
    };

    const saveSettings = async () => {
        setIsSaving(true);
        try {
            await api.updateShop({
                id: shopDetails.id,
                name: shopDetails.name,
                bwPrice: Number(shopDetails.bwPrice),
                colorPrice: Number(shopDetails.colorPrice),
                upiId: shopDetails.upiId,
                timings: shopDetails.timings
            });
            localStorage.setItem('shopDetails', JSON.stringify(shopDetails));
            setSavedMessage(true);
            setTimeout(() => setSavedMessage(false), 2500);
        } catch {
            alert("Error updating details.");
        } finally {
            setIsSaving(false);
        }
    };

    // LOGIN SCREEN
    if (!token) {
        return (
            <div className="min-h-screen bg-[#02050A] flex flex-col items-center justify-center p-4 sm:p-6 font-sans relative overflow-hidden">
                <div className="w-full max-w-md bg-[#0A111E] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl text-center relative z-10">
                    <div className="mb-5 flex flex-col items-center">
                        <div className="w-12 h-12 bg-gradient-to-tr from-orange-500 to-amber-400 rounded-2xl flex items-center justify-center shadow-lg mb-2.5">
                            <Store className="w-6 h-6 text-[#040812]" />
                        </div>
                        <h1 className="text-xl sm:text-2xl font-black text-white">
                            Shopkeeper Console
                        </h1>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Anti-Screenshot Protected & Auto-Shred Terminal
                        </p>
                    </div>

                    <div className="bg-[#040812] border border-orange-500/20 rounded-2xl p-3 mb-5 text-left">
                        <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" /> 1-Click Demo Login:
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => handleQuickDemoLogin('sharma')}
                                className="bg-[#111A2C] hover:bg-[#1A263D] active:scale-95 transition-all p-2 rounded-xl border border-white/5 text-left"
                            >
                                <span className="text-xs font-bold text-white block leading-tight">Sharma Stationers</span>
                                <span className="text-[9px] text-emerald-400 font-semibold mt-0.5 block">ID: SHARMA-01</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleQuickDemoLogin('gupta')}
                                className="bg-[#111A2C] hover:bg-[#1A263D] active:scale-95 transition-all p-2 rounded-xl border border-white/5 text-left"
                            >
                                <span className="text-xs font-bold text-white block leading-tight">Gupta Prints</span>
                                <span className="text-[9px] text-teal-400 font-semibold mt-0.5 block">ID: GUPTA-02</span>
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleAuth} className="flex flex-col gap-3 text-left">
                        {authMode === 'register' && (
                            <input 
                                type="text" 
                                required 
                                value={shopName} 
                                onChange={e => setShopName(e.target.value)} 
                                placeholder="Shop Name" 
                                className="w-full bg-[#040812] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-orange-500 outline-none" 
                            />
                        )}
                        <input 
                            type="email" 
                            required 
                            value={email} 
                            onChange={e => setEmail(e.target.value)} 
                            placeholder="Email Address" 
                            className="w-full bg-[#040812] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-orange-500 outline-none" 
                        />
                        <input 
                            type="password" 
                            required 
                            value={password} 
                            onChange={e => setPassword(e.target.value)} 
                            placeholder="Password" 
                            className="w-full bg-[#040812] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-orange-500 outline-none" 
                        />
                        {authError && <p className="text-red-400 text-xs font-bold text-center">{authError}</p>}
                        
                        <button 
                            type="submit" 
                            className="w-full bg-orange-500 hover:bg-orange-400 text-[#040812] font-black text-xs py-3 rounded-xl transition-all shadow-md active:scale-95 mt-1"
                        >
                            {authMode === 'login' ? 'Sign In' : 'Create Account'}
                        </button>
                    </form>

                    <div className="mt-5 flex justify-between items-center text-xs">
                        <button 
                            onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} 
                            className="text-orange-400 hover:text-orange-300 font-bold"
                        >
                            {authMode === 'login' ? 'Register New Shop' : 'Sign In instead'}
                        </button>
                        <Link to="/" className="text-slate-400 hover:text-white font-medium flex items-center gap-1">
                            <span>Customer View</span>
                            <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const currentFileItem = viewOrder?.files?.[currentFileIdx];
    const currentFileName = currentFileItem?.name || 'Document';
    const isImageFile = (currentFileItem?.type && currentFileItem.type.startsWith('image/')) || 
                        Boolean(currentFileName.match(/\.(jpeg|jpg|gif|png)$/i));

    return (
        <>
            <style>{`
                body { 
                    background-color: #02050A; 
                    margin: 0; 
                    padding: 0; 
                    user-select: none !important; 
                    -webkit-user-select: none !important;
                }
                @media print { 
                    body { display: none !important; } 
                }
            `}</style>
            
            {/* AGGRESSIVE PRIVACY SHIELD BLACKOUT OVERLAY */}
            {isShieldActive && (
                <div className="fixed inset-0 z-[9999] bg-[#000000] flex flex-col items-center justify-center text-center p-6 select-none">
                    <div className="w-20 h-20 rounded-3xl bg-red-500/10 border-2 border-red-500/40 flex items-center justify-center text-red-500 mb-4 animate-pulse">
                        <ShieldAlert className="w-10 h-10" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-widest">
                        Privacy Shield Active
                    </h1>
                    <p className="text-red-400 text-xs sm:text-sm font-bold mt-2 max-w-md">
                        {shieldReason}
                    </p>
                    <p className="text-slate-500 text-[11px] mt-1 max-w-xs">
                        Screenshots, screen recording, and page inspecting are strictly blocked to protect customer data.
                    </p>
                    <button 
                        onClick={() => setIsShieldActive(false)} 
                        className="mt-6 px-6 py-2.5 bg-red-500 hover:bg-red-400 text-white text-xs font-black rounded-xl shadow-lg active:scale-95 transition-all"
                    >
                        Unlock Protected Session
                    </button>
                </div>
            )}

            {/* LIVE AUTO-SHRED CONFIRMATION TOAST */}
            {shredNotification && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-emerald-500 text-[#040812] px-4 py-2.5 rounded-2xl font-black text-xs flex items-center gap-2 shadow-2xl animate-in slide-in-from-top duration-200">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>{shredNotification}</span>
                </div>
            )}

            {/* SECURE VIEWER WITH FULL EDITING SUITE (Crop, Resolution, Size & Margin) */}
            {viewOrder && (
                <div className="fixed inset-0 z-[50] bg-[#02050A]/95 backdrop-blur-md flex flex-col p-3 sm:p-5 select-none animate-in fade-in duration-150">
                    
                    {/* Viewer Header */}
                    <div className="flex justify-between items-center mb-2.5 max-w-6xl mx-auto w-full">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-white font-extrabold text-base">Secure Print Studio</span>
                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3" /> Auto-Shred on Print
                                </span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                                Token: <strong className="text-emerald-400">{viewOrder.tokenId}</strong> • File {currentFileIdx + 1}/{viewOrder.files.length} ({currentFileName})
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <button 
                                onClick={handleViewerPrintWithEdits}
                                disabled={printingOrderId === viewOrder._id}
                                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-[#040812] text-xs font-black rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
                            >
                                {printingOrderId === viewOrder._id ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Printing & Shredding...</span>
                                    </>
                                ) : (
                                    <>
                                        <Printer className="w-4 h-4" />
                                        <span>Print & Auto-Destroy</span>
                                    </>
                                )}
                            </button>

                            <button 
                                onClick={closeViewer} 
                                className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl text-xs font-bold border border-red-500/30"
                            >
                                Close
                            </button>
                        </div>
                    </div>

                    {/* Viewer Work Area: Preview on Left, Editing Suite on Right */}
                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 max-w-6xl mx-auto w-full overflow-hidden">
                        
                        {/* Document Canvas Preview with Live Anti-Screenshot Watermark */}
                        <div className="lg:col-span-8 bg-[#040812] rounded-2xl border border-white/10 relative overflow-hidden flex items-center justify-center p-3">
                            <div className="relative max-w-full max-h-full flex items-center justify-center overflow-hidden rounded-xl shadow-2xl">
                                {resolvedFileDataUrl ? (
                                    isImageFile ? (
                                        <div 
                                            ref={cropContainerRef} 
                                            className="relative inline-block select-none touch-none"
                                            style={{ 
                                                transform: `rotate(${rotation}deg) scale(${scale})`, 
                                                transition: dragInfo ? 'none' : 'transform 0.15s ease-out'
                                            }}
                                        >
                                            <img 
                                                src={resolvedFileDataUrl} 
                                                alt="Secure Print Doc" 
                                                style={{ 
                                                    clipPath: (activeEditTool === 'crop' && !cropPreviewMode) 
                                                        ? 'none' 
                                                        : `inset(${cropBounds.top}% ${cropBounds.right}% ${cropBounds.bottom}% ${cropBounds.left}%)`, 
                                                    filter: `contrast(${bwEnhance ? 220 : contrast}%) brightness(${brightness}%) ${bwEnhance ? 'grayscale(100%)' : ''} ${invertColors ? 'invert(100%)' : ''}`,
                                                    maxHeight: '68vh',
                                                    display: 'block'
                                                }} 
                                                className="max-w-full object-contain pointer-events-none block select-none" 
                                                draggable={false}
                                            />

                                            {/* Interactive Freeform Crop Box with Draggable Handles */}
                                            {activeEditTool === 'crop' && !cropPreviewMode && (
                                                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                                    {/* Outside darkening mask + orange active frame */}
                                                    <div 
                                                        className="absolute border-2 border-orange-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] pointer-events-auto transition-none"
                                                        style={{ 
                                                            top: `${cropBounds.top}%`,
                                                            left: `${cropBounds.left}%`,
                                                            width: `${Math.max(2, 100 - cropBounds.left - cropBounds.right)}%`,
                                                            height: `${Math.max(2, 100 - cropBounds.top - cropBounds.bottom)}%`,
                                                        }}
                                                    >
                                                        {/* Draggable Inner Body */}
                                                        <div 
                                                            onMouseDown={(e) => startCropDrag(e, 'move')}
                                                            onTouchStart={(e) => startCropDrag(e, 'move')}
                                                            className="absolute inset-0 cursor-move flex items-center justify-center group"
                                                            title="Click & drag to move crop box"
                                                        >
                                                            {/* 3x3 Rule-of-Thirds Grid */}
                                                            <div className="w-full h-full grid grid-cols-3 grid-rows-3 pointer-events-none opacity-30">
                                                                <div className="border-r border-b border-white"></div>
                                                                <div className="border-r border-b border-white"></div>
                                                                <div className="border-b border-white"></div>
                                                                <div className="border-r border-b border-white"></div>
                                                                <div className="border-r border-b border-white"></div>
                                                                <div className="border-b border-white"></div>
                                                                <div className="border-r border-white"></div>
                                                                <div className="border-r border-white"></div>
                                                                <div></div>
                                                            </div>

                                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 px-2 py-0.5 rounded text-[8px] font-black text-orange-400 pointer-events-none flex items-center gap-1 border border-orange-500/30">
                                                                <Move className="w-2.5 h-2.5" /> Drag Box
                                                            </div>
                                                        </div>

                                                        {/* Floating Active Dimensions Chip */}
                                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-orange-500 text-[#040812] text-[8px] font-black px-2 py-0.5 rounded-full shadow-lg pointer-events-none whitespace-nowrap flex items-center gap-1">
                                                            <span>{cropAspectMode === 'free' ? 'CUSTOM FREE CROP' : cropAspectMode.toUpperCase()}</span>
                                                            <span>•</span>
                                                            <span>{Math.round(100 - cropBounds.left - cropBounds.right)}% × {Math.round(100 - cropBounds.top - cropBounds.bottom)}%</span>
                                                        </div>

                                                        {/* Corner Drag Handles */}
                                                        {/* NW: Top-Left */}
                                                        <div 
                                                            onMouseDown={(e) => startCropDrag(e, 'nw')}
                                                            onTouchStart={(e) => startCropDrag(e, 'nw')}
                                                            className="absolute -top-2.5 -left-2.5 w-5 h-5 bg-orange-500 border-2 border-white rounded-md cursor-nwse-resize shadow-lg hover:scale-125 transition-transform pointer-events-auto flex items-center justify-center"
                                                            title="Free Resize Top-Left"
                                                        />
                                                        {/* NE: Top-Right */}
                                                        <div 
                                                            onMouseDown={(e) => startCropDrag(e, 'ne')}
                                                            onTouchStart={(e) => startCropDrag(e, 'ne')}
                                                            className="absolute -top-2.5 -right-2.5 w-5 h-5 bg-orange-500 border-2 border-white rounded-md cursor-nesw-resize shadow-lg hover:scale-125 transition-transform pointer-events-auto flex items-center justify-center"
                                                            title="Free Resize Top-Right"
                                                        />
                                                        {/* SW: Bottom-Left */}
                                                        <div 
                                                            onMouseDown={(e) => startCropDrag(e, 'sw')}
                                                            onTouchStart={(e) => startCropDrag(e, 'sw')}
                                                            className="absolute -bottom-2.5 -left-2.5 w-5 h-5 bg-orange-500 border-2 border-white rounded-md cursor-nesw-resize shadow-lg hover:scale-125 transition-transform pointer-events-auto flex items-center justify-center"
                                                            title="Free Resize Bottom-Left"
                                                        />
                                                        {/* SE: Bottom-Right */}
                                                        <div 
                                                            onMouseDown={(e) => startCropDrag(e, 'se')}
                                                            onTouchStart={(e) => startCropDrag(e, 'se')}
                                                            className="absolute -bottom-2.5 -right-2.5 w-5 h-5 bg-orange-500 border-2 border-white rounded-md cursor-nwse-resize shadow-lg hover:scale-125 transition-transform pointer-events-auto flex items-center justify-center"
                                                            title="Free Resize Bottom-Right"
                                                        />

                                                        {/* Edge Midpoint Drag Handles */}
                                                        {/* N: Top */}
                                                        <div 
                                                            onMouseDown={(e) => startCropDrag(e, 'n')}
                                                            onTouchStart={(e) => startCropDrag(e, 'n')}
                                                            className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-3 bg-white rounded-full cursor-ns-resize shadow-md hover:bg-orange-400 pointer-events-auto"
                                                            title="Free Crop Top Edge"
                                                        />
                                                        {/* S: Bottom */}
                                                        <div 
                                                            onMouseDown={(e) => startCropDrag(e, 's')}
                                                            onTouchStart={(e) => startCropDrag(e, 's')}
                                                            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-3 bg-white rounded-full cursor-ns-resize shadow-md hover:bg-orange-400 pointer-events-auto"
                                                            title="Free Crop Bottom Edge"
                                                        />
                                                        {/* W: Left */}
                                                        <div 
                                                            onMouseDown={(e) => startCropDrag(e, 'w')}
                                                            onTouchStart={(e) => startCropDrag(e, 'w')}
                                                            className="absolute top-1/2 -translate-y-1/2 -left-2 w-3 h-8 bg-white rounded-full cursor-ew-resize shadow-md hover:bg-orange-400 pointer-events-auto"
                                                            title="Free Crop Left Edge"
                                                        />
                                                        {/* E: Right */}
                                                        <div 
                                                            onMouseDown={(e) => startCropDrag(e, 'e')}
                                                            onTouchStart={(e) => startCropDrag(e, 'e')}
                                                            className="absolute top-1/2 -translate-y-1/2 -right-2 w-3 h-8 bg-white rounded-full cursor-ew-resize shadow-md hover:bg-orange-400 pointer-events-auto"
                                                            title="Free Crop Right Edge"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <iframe 
                                            src={`${resolvedFileDataUrl}#toolbar=0`} 
                                            className="w-[50vw] h-[65vh] border-none bg-white block rounded-lg pointer-events-none" 
                                            title="Secure Document" 
                                        />
                                    )
                                ) : (
                                    <div className="p-8 text-center text-slate-400">
                                        <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                                        <p className="text-xs">Document was shredded or unavailable.</p>
                                    </div>
                                )}

                                {/* High-Security Dynamic Moving Watermark (Screenshot Defeater) */}
                                <div className="absolute inset-0 z-30 pointer-events-none flex flex-wrap justify-around items-center overflow-hidden select-none bg-red-500/[0.04]">
                                    {Array.from({ length: 24 }).map((_, i) => (
                                        <p key={i} className="text-red-500/50 font-black text-sm sm:text-base -rotate-45 m-3 select-none whitespace-nowrap drop-shadow-md">
                                            DO NOT CAPTURE • {viewOrder.tokenId} • {securityTimestamp}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Editing Suite Sidebar (Cropping, Resolution, Margin & Size Setting) */}
                        <div className="lg:col-span-4 bg-[#0A111E] rounded-2xl border border-white/10 p-3.5 flex flex-col justify-between overflow-y-auto hide-scrollbar space-y-3">
                            <div>
                                {/* Edit Mode Tab Switcher */}
                                <div className="flex bg-[#040812] p-1 rounded-xl border border-white/5 mb-3">
                                    <button
                                        onClick={() => setActiveEditTool('adjust')}
                                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${
                                            activeEditTool === 'adjust' ? 'bg-orange-500 text-black' : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        <Contrast className="w-3.5 h-3.5" /> Adjust
                                    </button>
                                    <button
                                        onClick={() => setActiveEditTool('crop')}
                                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${
                                            activeEditTool === 'crop' ? 'bg-orange-500 text-black' : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        <Crop className="w-3.5 h-3.5" /> Crop
                                    </button>
                                    <button
                                        onClick={() => setActiveEditTool('size')}
                                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${
                                            activeEditTool === 'size' ? 'bg-orange-500 text-black' : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        <Maximize className="w-3.5 h-3.5" /> Size & Margin
                                    </button>
                                </div>

                                {/* TAB 1: RESOLUTION / CONTRAST / BRIGHTNESS ADJUSTMENTS */}
                                {activeEditTool === 'adjust' && (
                                    <div className="space-y-3 animate-in fade-in duration-100">
                                        <div>
                                            <div className="flex justify-between text-[10px] font-bold mb-1">
                                                <span className="text-slate-400 uppercase">Text Contrast (Photocopy Sharpness)</span>
                                                <span className="text-orange-400">{contrast}%</span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="50" 
                                                max="250" 
                                                value={contrast} 
                                                onChange={(e) => setContrast(Number(e.target.value))} 
                                                className="w-full accent-orange-500 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                                            />
                                        </div>

                                        <div>
                                            <div className="flex justify-between text-[10px] font-bold mb-1">
                                                <span className="text-slate-400 uppercase">Background Brightness (Clean Grays)</span>
                                                <span className="text-orange-400">{brightness}%</span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="50" 
                                                max="150" 
                                                value={brightness} 
                                                onChange={(e) => setBrightness(Number(e.target.value))} 
                                                className="w-full accent-orange-500 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                                            />
                                        </div>

                                        {/* Preset Filters */}
                                        <div className="grid grid-cols-2 gap-2 pt-1">
                                            <button
                                                onClick={() => setBwEnhance(!bwEnhance)}
                                                className={`p-2 rounded-xl border text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                                                    bwEnhance ? 'bg-emerald-500 text-black border-emerald-400' : 'bg-[#040812] border-white/5 text-slate-300'
                                                }`}
                                            >
                                                <span>✨ Sharp B&W Boost</span>
                                            </button>
                                            <button
                                                onClick={() => setInvertColors(!invertColors)}
                                                className={`p-2 rounded-xl border text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                                                    invertColors ? 'bg-blue-500 text-white border-blue-400' : 'bg-[#040812] border-white/5 text-slate-300'
                                                }`}
                                            >
                                                <span>🌓 Invert Dark Notes</span>
                                            </button>
                                        </div>

                                        {/* Rotation */}
                                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Orientation</span>
                                            <div className="flex gap-1.5">
                                                <button onClick={() => setRotation(r => (r + 90) % 360)} className="px-2.5 py-1 rounded-lg bg-[#040812] text-xs font-bold text-white hover:bg-white/10 flex items-center gap-1">
                                                    <RotateCw className="w-3 h-3" /> +90°
                                                </button>
                                                <button onClick={() => { setRotation(0); setContrast(100); setBrightness(100); setBwEnhance(false); setInvertColors(false); }} className="px-2 py-1 rounded-lg bg-[#040812] text-[10px] font-bold text-slate-400 hover:text-white">
                                                    Reset
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* TAB 2: CROPPING CONTROLS */}
                                {activeEditTool === 'crop' && (
                                    <div className="space-y-3 animate-in fade-in duration-100">
                                        {/* Freeform / Mode Selectors */}
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-[10px] text-slate-400 font-bold uppercase">Cropping Mode</span>
                                                <span className="text-[9px] text-orange-400 font-black">
                                                    {cropAspectMode === 'free' ? '✨ Custom Freeform' : cropAspectMode.toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-1.5">
                                                <button
                                                    onClick={() => applyCropPreset('free')}
                                                    className={`py-1.5 px-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 border transition-all ${
                                                        cropAspectMode === 'free'
                                                            ? 'bg-orange-500 text-black border-orange-400 shadow-md font-black'
                                                            : 'bg-[#040812] text-slate-300 border-white/5 hover:border-white/20'
                                                    }`}
                                                >
                                                    <Scissors className="w-3 h-3" />
                                                    <span>Freeform (Custom)</span>
                                                </button>
                                                <button
                                                    onClick={() => applyCropPreset('1:1')}
                                                    className={`py-1.5 px-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 border transition-all ${
                                                        cropAspectMode === '1:1'
                                                            ? 'bg-orange-500 text-black border-orange-400 shadow-md font-black'
                                                            : 'bg-[#040812] text-slate-300 border-white/5 hover:border-white/20'
                                                    }`}
                                                >
                                                    <span>🔲 1:1 Square</span>
                                                </button>
                                                <button
                                                    onClick={() => applyCropPreset('a4')}
                                                    className={`py-1.5 px-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 border transition-all ${
                                                        cropAspectMode === 'a4'
                                                            ? 'bg-orange-500 text-black border-orange-400 shadow-md font-black'
                                                            : 'bg-[#040812] text-slate-300 border-white/5 hover:border-white/20'
                                                    }`}
                                                >
                                                    <span>📄 A4 Ratio</span>
                                                </button>
                                                <button
                                                    onClick={() => applyCropPreset('passport')}
                                                    className={`py-1.5 px-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 border transition-all ${
                                                        cropAspectMode === 'passport'
                                                            ? 'bg-orange-500 text-black border-orange-400 shadow-md font-black'
                                                            : 'bg-[#040812] text-slate-300 border-white/5 hover:border-white/20'
                                                    }`}
                                                >
                                                    <span>🛂 Passport Photo</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Free Cropping Interactive Tip */}
                                        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-2 text-[10px] text-orange-300 leading-snug">
                                            <span className="font-black text-orange-400 block mb-0.5">💡 Interactive Free Cropping:</span>
                                            Drag the 8 handles directly on the document preview to freely crop any portion. Drag inside the orange box to move it anywhere.
                                        </div>

                                        {/* View Mode Toggle: Interactive Box vs Live Preview */}
                                        <div className="flex bg-[#040812] p-1 rounded-xl border border-white/5">
                                            <button
                                                onClick={() => setCropPreviewMode(false)}
                                                className={`flex-1 py-1 rounded-lg text-[9px] font-bold flex items-center justify-center gap-1 transition-all ${
                                                    !cropPreviewMode ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'text-slate-400'
                                                }`}
                                            >
                                                <Crop className="w-3 h-3" /> Drag Crop Handles
                                            </button>
                                            <button
                                                onClick={() => setCropPreviewMode(true)}
                                                className={`flex-1 py-1 rounded-lg text-[9px] font-bold flex items-center justify-center gap-1 transition-all ${
                                                    cropPreviewMode ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400'
                                                }`}
                                            >
                                                <Eye className="w-3 h-3" /> Preview Cut Result
                                            </button>
                                        </div>

                                        {/* Precision Margin Sliders (%) */}
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] text-slate-400 font-bold uppercase">Fine-Tune Margins (%)</span>
                                                <button
                                                    onClick={() => setCropBounds({ top: 0, right: 0, bottom: 0, left: 0 })}
                                                    className="text-[9px] text-slate-400 hover:text-white underline"
                                                >
                                                    Reset (0%)
                                                </button>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-2 text-[10px]">
                                                <div className="bg-[#040812] p-1.5 rounded-lg border border-white/5">
                                                    <div className="flex justify-between text-[9px] font-bold mb-0.5">
                                                        <span className="text-slate-400">Top Cut</span>
                                                        <span className="text-orange-400">{cropBounds.top}%</span>
                                                    </div>
                                                    <input 
                                                        type="range" 
                                                        min="0" 
                                                        max="80" 
                                                        value={cropBounds.top} 
                                                        onChange={(e) => setCropBounds({ ...cropBounds, top: Number(e.target.value) })} 
                                                        className="w-full accent-orange-500 h-1 bg-white/10 rounded cursor-pointer" 
                                                    />
                                                </div>
                                                <div className="bg-[#040812] p-1.5 rounded-lg border border-white/5">
                                                    <div className="flex justify-between text-[9px] font-bold mb-0.5">
                                                        <span className="text-slate-400">Bottom Cut</span>
                                                        <span className="text-orange-400">{cropBounds.bottom}%</span>
                                                    </div>
                                                    <input 
                                                        type="range" 
                                                        min="0" 
                                                        max="80" 
                                                        value={cropBounds.bottom} 
                                                        onChange={(e) => setCropBounds({ ...cropBounds, bottom: Number(e.target.value) })} 
                                                        className="w-full accent-orange-500 h-1 bg-white/10 rounded cursor-pointer" 
                                                    />
                                                </div>
                                                <div className="bg-[#040812] p-1.5 rounded-lg border border-white/5">
                                                    <div className="flex justify-between text-[9px] font-bold mb-0.5">
                                                        <span className="text-slate-400">Left Cut</span>
                                                        <span className="text-orange-400">{cropBounds.left}%</span>
                                                    </div>
                                                    <input 
                                                        type="range" 
                                                        min="0" 
                                                        max="80" 
                                                        value={cropBounds.left} 
                                                        onChange={(e) => setCropBounds({ ...cropBounds, left: Number(e.target.value) })} 
                                                        className="w-full accent-orange-500 h-1 bg-white/10 rounded cursor-pointer" 
                                                    />
                                                </div>
                                                <div className="bg-[#040812] p-1.5 rounded-lg border border-white/5">
                                                    <div className="flex justify-between text-[9px] font-bold mb-0.5">
                                                        <span className="text-slate-400">Right Cut</span>
                                                        <span className="text-orange-400">{cropBounds.right}%</span>
                                                    </div>
                                                    <input 
                                                        type="range" 
                                                        min="0" 
                                                        max="80" 
                                                        value={cropBounds.right} 
                                                        onChange={(e) => setCropBounds({ ...cropBounds, right: Number(e.target.value) })} 
                                                        className="w-full accent-orange-500 h-1 bg-white/10 rounded cursor-pointer" 
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Quick Action Presets */}
                                        <div className="pt-2 border-t border-white/5 flex gap-1.5 flex-wrap">
                                            <button 
                                                onClick={() => { setCropAspectMode('free'); setCropBounds({ top: 0, right: 0, bottom: 0, left: 0 }); }} 
                                                className="px-2 py-1 bg-[#040812] hover:bg-[#111A2C] rounded-lg text-[9px] font-bold text-slate-300 border border-white/5"
                                            >
                                                Full Page (0%)
                                            </button>
                                            <button 
                                                onClick={() => { setCropAspectMode('free'); setCropBounds({ top: 4, right: 4, bottom: 4, left: 4 }); }} 
                                                className="px-2 py-1 bg-[#040812] hover:bg-[#111A2C] rounded-lg text-[9px] font-bold text-slate-300 border border-white/5"
                                            >
                                                Border Trim (4%)
                                            </button>
                                            <button 
                                                onClick={() => { setCropAspectMode('free'); setCropBounds({ top: 22, right: 12, bottom: 22, left: 12 }); }} 
                                                className="px-2 py-1 bg-[#040812] hover:bg-[#111A2C] rounded-lg text-[9px] font-bold text-slate-300 border border-white/5"
                                            >
                                                Center Card
                                            </button>
                                            <button 
                                                onClick={() => { setCropAspectMode('free'); setCropBounds({ top: 0, right: 0, bottom: 50, left: 0 }); }} 
                                                className="px-2 py-1 bg-[#040812] hover:bg-[#111A2C] rounded-lg text-[9px] font-bold text-slate-300 border border-white/5"
                                            >
                                                Top Half
                                            </button>
                                            <button 
                                                onClick={() => { setCropAspectMode('free'); setCropBounds({ top: 50, right: 0, bottom: 0, left: 0 }); }} 
                                                className="px-2 py-1 bg-[#040812] hover:bg-[#111A2C] rounded-lg text-[9px] font-bold text-slate-300 border border-white/5"
                                            >
                                                Bottom Half
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* TAB 3: SIZE & MARGIN SETTINGS */}
                                {activeEditTool === 'size' && (
                                    <div className="space-y-3 animate-in fade-in duration-100">
                                        <div>
                                            <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Target Sheet Size</label>
                                            <div className="grid grid-cols-4 gap-1.5">
                                                {['A4', 'Legal', 'A3', 'Letter'].map((sz) => (
                                                    <button
                                                        key={sz}
                                                        onClick={() => setPageSize(sz)}
                                                        className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                            pageSize === sz ? 'bg-orange-500 text-black' : 'bg-[#040812] text-slate-300'
                                                        }`}
                                                    >
                                                        {sz}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Binding Margin Setting</label>
                                            <div className="grid grid-cols-3 gap-1.5">
                                                {[
                                                    { id: '0mm', label: '0mm (Full Bleed)' },
                                                    { id: '5mm', label: '5mm (Standard)' },
                                                    { id: '10mm', label: '10mm (Spiral Bind)' },
                                                ].map((mg) => (
                                                    <button
                                                        key={mg.id}
                                                        onClick={() => setMarginSize(mg.id)}
                                                        className={`p-1.5 rounded-lg text-[10px] font-bold transition-all ${
                                                            marginSize === mg.id ? 'bg-emerald-500 text-black' : 'bg-[#040812] text-slate-300'
                                                        }`}
                                                    >
                                                        {mg.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex justify-between text-[10px] font-bold mb-1">
                                                <span className="text-slate-400 uppercase">Scale Zoom</span>
                                                <span className="text-orange-400">{(scale * 100).toFixed(0)}%</span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="0.5" 
                                                max="1.8" 
                                                step="0.05"
                                                value={scale} 
                                                onChange={(e) => setScale(Number(e.target.value))} 
                                                className="w-full accent-orange-500 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Privacy Protocol Notice */}
                            <div className="bg-[#040812] p-2.5 rounded-xl border border-emerald-500/20 text-[10px] text-emerald-400">
                                <span className="font-bold block mb-0.5">🔒 Auto-Shred Protected:</span>
                                Once printed, all data will be permanently wiped from browser storage.
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* MAIN SHOPKEEPER DASHBOARD */}
            <div className="min-h-screen bg-[#02050A] font-sans selection:bg-orange-500/30 relative">
                
                {/* Header */}
                <header className="sticky top-0 h-14 px-4 sm:px-6 flex justify-between items-center z-20 border-b border-white/5 bg-[#040812]/95 backdrop-blur-md shadow-md">
                    <div className="flex items-center gap-2.5 text-orange-400">
                        <Link 
                            to="/" 
                            className="p-1.5 rounded-lg bg-[#111A2C] text-slate-400 hover:text-white transition-colors"
                            title="Back to Customer App"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Link>
                        <div className="p-1.5 bg-orange-500/10 rounded-lg border border-orange-500/20">
                            <Store className="w-4 h-4" />
                        </div>
                        <div>
                            <h1 className="text-sm font-bold text-white leading-tight">{shopDetails.name}</h1>
                            <p className="text-[9px] text-orange-400 font-semibold">ID: {shopDetails.id}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Simulate Test Order Button */}
                        <button 
                            onClick={() => {
                                const newOrd = generateDemoOrder(shopDetails.id);
                                setOrders(prev => [newOrd, ...prev.filter(o => o._id !== newOrd._id)]);
                            }}
                            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold active:scale-95 transition-all shadow-sm"
                            title="Inject test order into live queue"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>+ Test Order</span>
                        </button>

                        {/* Counter Poster QR */}
                        <button
                            onClick={() => setShowCounterQrModal(true)}
                            className="p-2 bg-[#111A2C] hover:bg-[#1A263D] text-slate-300 hover:text-white rounded-xl border border-white/5 transition-all active:scale-95"
                            title="View Counter Poster QR"
                        >
                            <QrCode className="w-4 h-4 text-emerald-400" />
                        </button>

                        {/* Sound Toggle */}
                        <button
                            onClick={() => setIsSoundMuted(!isSoundMuted)}
                            className="p-2 bg-[#111A2C] hover:bg-[#1A263D] text-slate-300 hover:text-white rounded-xl border border-white/5 transition-all active:scale-95"
                            title={isSoundMuted ? "Unmute sound chimes" : "Mute sound chimes"}
                        >
                            {isSoundMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                        </button>

                        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-[9px] font-black uppercase">
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            <span>DRM Shield Active</span>
                        </div>

                        {activeTab === 'dashboard' ? (
                            <button 
                                onClick={() => setActiveTab('settings')} 
                                className="px-3 py-1.5 bg-[#111A2C] hover:bg-[#1A263D] rounded-xl border border-white/5 text-slate-300 text-xs font-bold flex items-center gap-1.5"
                            >
                                <Settings className="w-3.5 h-3.5" /> 
                                <span>Settings</span>
                            </button>
                        ) : (
                            <button 
                                onClick={() => setActiveTab('dashboard')} 
                                className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-1.5"
                            >
                                <ChevronLeft className="w-3.5 h-3.5" /> 
                                <span>Queue</span>
                            </button>
                        )}

                        <button 
                            onClick={() => { 
                                sessionStorage.removeItem('shopToken'); 
                                localStorage.removeItem('shopDetails'); 
                                setToken(null); 
                            }} 
                            className="px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 rounded-xl text-xs font-bold"
                        >
                            Logout
                        </button>
                    </div>
                </header>

                <main className="max-w-6xl mx-auto px-4 py-4 sm:py-5 relative z-10">
                    
                    {activeTab === 'dashboard' && (
                        <div className="space-y-4">
                            {/* KPI Metrics */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="bg-[#0A111E] p-3.5 rounded-2xl border border-white/5 shadow-md flex items-center justify-between">
                                    <div>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase">Pending Queue</p>
                                        <p className="text-2xl font-black text-orange-400 mt-0.5">
                                            {orders.filter(o => o.status === 'pending' || o.status === 'printing').length}
                                        </p>
                                    </div>
                                    <Clock className="w-6 h-6 text-orange-400 opacity-60" />
                                </div>

                                <div className="bg-[#0A111E] p-3.5 rounded-2xl border border-white/5 shadow-md flex items-center justify-between">
                                    <div>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase">Completed & Shredded</p>
                                        <p className="text-2xl font-black text-emerald-400 mt-0.5">
                                            {orders.filter(o => o.status === 'completed' || o.filesShredded).length}
                                        </p>
                                    </div>
                                    <ShieldCheck className="w-6 h-6 text-emerald-400 opacity-60" />
                                </div>

                                <div className="bg-[#0A111E] p-3.5 rounded-2xl border border-white/5 shadow-md flex items-center justify-between">
                                    <div>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase">Total Revenue</p>
                                        <p className="text-2xl font-black text-white mt-0.5">
                                            ₹{orders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0)}
                                        </p>
                                    </div>
                                    <IndianRupee className="w-6 h-6 text-emerald-400 opacity-60" />
                                </div>

                                <div className="bg-[#0A111E] p-3.5 rounded-2xl border border-white/5 shadow-md flex items-center justify-between">
                                    <div>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase">Active Rates</p>
                                        <p className="text-xs font-bold text-white mt-1">
                                            B&W ₹{shopDetails.bwPrice} • Color ₹{shopDetails.colorPrice}
                                        </p>
                                    </div>
                                    <button onClick={fetchOrders} className="p-2 bg-[#111A2C] rounded-lg text-slate-300 hover:text-white" title="Refresh Orders">
                                        <RefreshCcw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-orange-400' : ''}`} />
                                    </button>
                                </div>
                            </div>

                            {/* Search and Filter Navigation Bar */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0A111E] p-3 rounded-2xl border border-white/5 shadow-md">
                                <div className="relative flex-1 max-w-sm">
                                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input 
                                        type="text" 
                                        value={searchQuery} 
                                        onChange={(e) => setSearchQuery(e.target.value)} 
                                        placeholder="Search Token (e.g. SP-108) or Customer..."
                                        className="w-full bg-[#040812] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-orange-500 transition-colors"
                                    />
                                    {searchQuery && (
                                        <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs">
                                            ×
                                        </button>
                                    )}
                                </div>

                                <div className="flex overflow-x-auto hide-scrollbar gap-1.5">
                                    {[
                                        { id: 'all', label: 'All', count: orders.length },
                                        { id: 'pending', label: 'In Queue', count: orders.filter(o => o.status === 'pending').length },
                                        { id: 'printing', label: 'Printing', count: orders.filter(o => o.status === 'printing').length },
                                        { id: 'ready', label: 'Ready', count: orders.filter(o => o.status === 'ready').length },
                                        { id: 'completed', label: 'Completed', count: orders.filter(o => o.status === 'completed' || o.filesShredded).length }
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setOrderFilter(tab.id)}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                                                orderFilter === tab.id 
                                                    ? 'bg-orange-500 text-black font-black shadow-sm' 
                                                    : 'bg-[#040812] text-slate-400 hover:text-white border border-white/5'
                                            }`}
                                        >
                                            <span>{tab.label}</span>
                                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                                orderFilter === tab.id ? 'bg-black/20 text-black' : 'bg-white/10 text-slate-300'
                                            }`}>
                                                {tab.count}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Orders Grid */}
                            {isLoading ? (
                                <div className="py-20 text-center text-slate-400">
                                    <Loader2 className="w-8 h-8 animate-spin text-orange-400 mx-auto mb-2" />
                                    <p className="text-xs">Loading queue...</p>
                                </div>
                            ) : orders.filter(o => {
                                if (orderFilter === 'pending' && o.status !== 'pending') return false;
                                if (orderFilter === 'printing' && o.status !== 'printing') return false;
                                if (orderFilter === 'ready' && o.status !== 'ready') return false;
                                if (orderFilter === 'completed' && o.status !== 'completed' && !o.filesShredded) return false;
                                if (searchQuery.trim()) {
                                    const q = searchQuery.toLowerCase();
                                    const matchToken = o.tokenId?.toLowerCase().includes(q);
                                    const matchCust = o.customerName?.toLowerCase().includes(q);
                                    const matchPhone = o.customerPhone?.includes(q);
                                    if (!matchToken && !matchCust && !matchPhone) return false;
                                }
                                return true;
                            }).length === 0 ? (
                                <div className="py-16 text-center bg-[#0A111E] rounded-2xl border border-white/5 p-6 max-w-sm mx-auto">
                                    <Printer className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                                    <p className="text-sm font-bold text-white">No Orders Match Filter</p>
                                    <p className="text-[11px] text-slate-400 mt-1">
                                        {searchQuery ? 'Try another search term.' : 'Click "+ Test Order" above to inject a demo order.'}
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3.5">
                                    {orders.filter(o => {
                                        if (orderFilter === 'pending' && o.status !== 'pending') return false;
                                        if (orderFilter === 'printing' && o.status !== 'printing') return false;
                                        if (orderFilter === 'ready' && o.status !== 'ready') return false;
                                        if (orderFilter === 'completed' && o.status !== 'completed' && !o.filesShredded) return false;
                                        if (searchQuery.trim()) {
                                            const q = searchQuery.toLowerCase();
                                            const matchToken = o.tokenId?.toLowerCase().includes(q);
                                            const matchCust = o.customerName?.toLowerCase().includes(q);
                                            const matchPhone = o.customerPhone?.includes(q);
                                            if (!matchToken && !matchCust && !matchPhone) return false;
                                        }
                                        return true;
                                    }).map((order) => {
                                        const isPending = order.status === 'pending';
                                        const isPrinting = order.status === 'printing';
                                        const isReady = order.status === 'ready';

                                        return (
                                            <div 
                                                key={order._id} 
                                                className={`bg-[#0A111E] border rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-md transition-all ${
                                                    isReady 
                                                        ? 'border-emerald-500/40 bg-gradient-to-b from-[#0a1a1f] to-[#0A111E]' 
                                                        : isPrinting
                                                        ? 'border-blue-500/30'
                                                        : 'border-white/5 hover:border-orange-500/25'
                                                }`}
                                            >
                                                <div>
                                                    {/* Header row */}
                                                    <div className="flex justify-between items-start mb-2.5">
                                                        <div className="flex items-center gap-2">
                                                            <div className="px-3 py-1.5 rounded-xl bg-[#111A2C] border border-white/5 flex flex-col items-center justify-center">
                                                                <span className="text-[8px] text-slate-400 font-bold uppercase">Token</span>
                                                                <span className="text-sm font-black text-emerald-400 leading-none mt-0.5">{order.tokenId}</span>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] text-slate-400 font-medium">
                                                                    {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </p>
                                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                                    <span className="text-sm font-black text-white">₹{order.amount}</span>
                                                                    <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-white/5 text-slate-300">
                                                                        {order.printType || 'B&W'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                                                            order.filesShredded || order.status === 'completed'
                                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                                : order.status === 'printing'
                                                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse'
                                                                : order.status === 'ready'
                                                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                                                : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                                        }`}>
                                                            {order.filesShredded ? 'Shredded' : order.status}
                                                        </span>
                                                    </div>

                                                    {/* Customer & Document Spec Box */}
                                                    <div className="bg-[#040812] rounded-xl border border-white/5 p-2.5 space-y-1.5 text-xs mb-2">
                                                        <div className="flex justify-between items-center">
                                                            <span className="font-bold text-white truncate">{order.customerName || 'Customer'}</span>
                                                            <span className="text-[9px] text-emerald-400 font-semibold">{order.paymentStatus || 'Paid'}</span>
                                                        </div>

                                                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
                                                            <span>{order.files?.length || 1} file(s)</span>
                                                            <span>•</span>
                                                            <span>{order.pages} pgs × {order.quantity} cpy</span>
                                                            {order.printSides && (
                                                                <span className="text-slate-300 bg-white/5 px-1.5 py-0.2 rounded">
                                                                    {order.printSides === 'double' ? 'Duplex' : 'Single'}
                                                                </span>
                                                            )}
                                                            {order.finishing && order.finishing !== 'none' && (
                                                                <span className="text-orange-400 bg-orange-500/10 px-1.5 py-0.2 rounded font-bold">
                                                                    {order.finishing}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {order.notes && (
                                                            <p className="text-[10px] text-slate-400 italic pt-1 border-t border-white/5">
                                                                "{order.notes}"
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Status Action Buttons */}
                                                <div className="space-y-1.5 pt-1">
                                                    {order.filesShredded || order.status === 'completed' ? (
                                                        <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold text-center flex items-center justify-center gap-1">
                                                            <ShieldCheck className="w-3.5 h-3.5" />
                                                            <span>Printed & Auto-Shredded</span>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="grid grid-cols-2 gap-1.5">
                                                                {isPending && (
                                                                    <button
                                                                        onClick={() => handleUpdateStatus(order._id, 'printing')}
                                                                        className="py-1.5 px-2 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/20 rounded-xl text-[10px] font-bold transition-all text-center"
                                                                    >
                                                                        Start Print
                                                                    </button>
                                                                )}
                                                                {isPrinting && (
                                                                    <button
                                                                        onClick={() => handleUpdateStatus(order._id, 'ready')}
                                                                        className="py-1.5 px-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/20 rounded-xl text-[10px] font-bold transition-all text-center"
                                                                    >
                                                                        Mark Ready
                                                                    </button>
                                                                )}
                                                                {isReady && (
                                                                    <button
                                                                        onClick={() => handleUpdateStatus(order._id, 'completed')}
                                                                        className="py-1.5 px-2 bg-slate-500/15 hover:bg-slate-500/25 text-slate-300 border border-slate-500/20 rounded-xl text-[10px] font-bold transition-all text-center"
                                                                    >
                                                                        Complete
                                                                    </button>
                                                                )}

                                                                {/* Studio preview button */}
                                                                <button
                                                                    onClick={() => setViewOrder(order)}
                                                                    className="py-1.5 px-2 bg-[#111A2C] hover:bg-[#1A263D] text-slate-300 rounded-xl border border-white/5 text-[10px] font-bold transition-all flex items-center justify-center gap-1"
                                                                >
                                                                    <Eye className="w-3 h-3 text-blue-400" />
                                                                    <span>Studio</span>
                                                                </button>
                                                            </div>

                                                            {/* Direct Print & Shred Button */}
                                                            <button 
                                                                onClick={() => handleBulkPrint(order)}
                                                                disabled={printingOrderId === order._id}
                                                                className="w-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-[#040812] text-xs font-black py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md"
                                                            >
                                                                {printingOrderId === order._id ? (
                                                                    <>
                                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                        <span>Printing...</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Printer className="w-3.5 h-3.5" />
                                                                        <span>Print & Auto-Shred</span>
                                                                    </>
                                                                )}
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* SETTINGS TAB */}
                    {activeTab === 'settings' && (
                        <div className="max-w-2xl mx-auto space-y-4">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-bold text-white">Shop Settings</h2>
                                <button 
                                    onClick={saveSettings} 
                                    disabled={isSaving}
                                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-[#040812] text-xs font-bold rounded-xl flex items-center gap-1.5"
                                >
                                    <Save className="w-3.5 h-3.5" />
                                    <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
                                </button>
                            </div>

                            {savedMessage && (
                                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl">
                                    Settings saved successfully!
                                </div>
                            )}

                            <div className="bg-[#0A111E] border border-white/5 rounded-2xl p-4 space-y-3 text-xs">
                                <div>
                                    <label className="text-slate-400 block mb-1 font-bold">Shop Name</label>
                                    <input 
                                        type="text" 
                                        value={shopDetails.name} 
                                        onChange={e => setShopDetails({ ...shopDetails, name: e.target.value })} 
                                        className="w-full bg-[#040812] border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-orange-500" 
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-slate-400 block mb-1 font-bold">B&W Rate (₹/pg)</label>
                                        <input 
                                            type="number" 
                                            value={shopDetails.bwPrice} 
                                            onChange={e => setShopDetails({ ...shopDetails, bwPrice: Number(e.target.value) })} 
                                            className="w-full bg-[#040812] border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-orange-500" 
                                        />
                                    </div>
                                    <div>
                                        <label className="text-slate-400 block mb-1 font-bold">Color Rate (₹/pg)</label>
                                        <input 
                                            type="number" 
                                            value={shopDetails.colorPrice} 
                                            onChange={e => setShopDetails({ ...shopDetails, colorPrice: Number(e.target.value) })} 
                                            className="w-full bg-[#040812] border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-orange-500" 
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </main>

                {/* COUNTER POSTER & STAND-IN QR MODAL */}
                {showCounterQrModal && (
                    <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
                        <div className="bg-[#0A111E] border border-white/10 rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl relative my-auto">
                            {/* Modal Bar */}
                            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                        <QrCode className="w-4 h-4 text-emerald-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-white">Counter Poster & Standee QR</h3>
                                        <p className="text-[10px] text-slate-400">Put this up at the counter for customers to scan & order</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => window.print()}
                                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-[#040812] text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                                    >
                                        <Printer className="w-3.5 h-3.5" />
                                        <span>Print Poster</span>
                                    </button>
                                    <button
                                        onClick={() => setShowCounterQrModal(false)}
                                        className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* PRINTABLE POSTER CARD (Clean light theme formatted for acrylic stand / counter) */}
                            <div className="bg-white text-slate-900 rounded-2xl p-5 sm:p-6 shadow-xl border border-slate-200 text-center relative overflow-hidden">
                                {/* Subtle decorative border accent */}
                                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-orange-500 via-amber-400 to-emerald-500"></div>

                                <div className="inline-flex items-center gap-1.5 bg-orange-100 text-orange-800 text-[10px] font-black uppercase px-3 py-1 rounded-full mb-3 tracking-wider">
                                    <Sparkles className="w-3 h-3 text-orange-600" />
                                    <span>SoftPaper Campus Print Point</span>
                                </div>

                                <h2 className="text-2xl font-black text-slate-900 leading-tight tracking-tight">
                                    {shopDetails.name}
                                </h2>
                                <p className="text-xs font-bold text-slate-500 mt-0.5">
                                    Counter ID: <span className="font-mono text-orange-600 font-extrabold">{shopDetails.id}</span>
                                </p>

                                <div className="my-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-4 flex flex-col items-center justify-center">
                                    <div className="p-2 bg-white rounded-xl shadow-md border border-slate-200">
                                        <img
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(typeof window !== 'undefined' ? `${window.location.origin}/?shop=${shopDetails.id}` : `https://softpaper.app/?shop=${shopDetails.id}`)}`}
                                            alt={`QR code for ${shopDetails.name}`}
                                            className="w-44 h-44 sm:w-48 sm:h-48 object-contain"
                                            onError={(e) => {
                                                // Fallback if network blocked
                                                e.target.style.display = 'none';
                                            }}
                                        />
                                    </div>
                                    <p className="text-[11px] font-extrabold text-slate-800 mt-2 flex items-center gap-1">
                                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Scan with any Camera, Google Lens or UPI App</span>
                                    </p>
                                </div>

                                {/* 3-Step Flow */}
                                <div className="grid grid-cols-3 gap-2 my-3 text-left">
                                    <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-200/80">
                                        <div className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-black flex items-center justify-center mb-1.5">1</div>
                                        <p className="text-[10px] font-bold text-slate-800 leading-tight">Scan QR Code</p>
                                        <p className="text-[8px] text-slate-500 mt-0.5">No app download</p>
                                    </div>
                                    <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-200/80">
                                        <div className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-black flex items-center justify-center mb-1.5">2</div>
                                        <p className="text-[10px] font-bold text-slate-800 leading-tight">Upload File</p>
                                        <p className="text-[8px] text-slate-500 mt-0.5">Choose B&W or Color</p>
                                    </div>
                                    <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-200/80">
                                        <div className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center mb-1.5">3</div>
                                        <p className="text-[10px] font-bold text-slate-800 leading-tight">Show Token</p>
                                        <p className="text-[8px] text-slate-500 mt-0.5">Collect at counter</p>
                                    </div>
                                </div>

                                {/* Pricing Strip */}
                                <div className="flex items-center justify-around bg-slate-900 text-white py-2.5 px-4 rounded-xl my-3 shadow-inner">
                                    <div className="text-center">
                                        <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">B&W Print</span>
                                        <span className="text-base font-black text-white">₹{shopDetails.bwPrice} <span className="text-[9px] font-normal text-slate-300">/pg</span></span>
                                    </div>
                                    <div className="h-6 w-px bg-white/20"></div>
                                    <div className="text-center">
                                        <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold block">Color Print</span>
                                        <span className="text-base font-black text-emerald-400">₹{shopDetails.colorPrice} <span className="text-[9px] font-normal text-emerald-200">/pg</span></span>
                                    </div>
                                </div>

                                {/* Security and Direct UPI Banner */}
                                <div className="flex items-center justify-between text-[9px] text-slate-500 pt-1 border-t border-slate-200 font-medium">
                                    <span className="flex items-center gap-1 text-emerald-700 font-bold">
                                        <Lock className="w-3 h-3 text-emerald-600" /> Auto-Shred Protected
                                    </span>
                                    <span className="flex items-center gap-1 text-slate-600">
                                        <IndianRupee className="w-3 h-3" /> UPI: <span className="font-mono font-bold text-slate-800">{shopDetails.upiId}</span>
                                    </span>
                                </div>
                            </div>

                            {/* Direct URL copy action */}
                            <div className="mt-4 flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        const url = `${window.location.origin}/?shop=${shopDetails.id}`;
                                        navigator.clipboard.writeText(url);
                                        setCopiedLink(true);
                                        setTimeout(() => setCopiedLink(false), 2000);
                                    }}
                                    className="flex-1 py-2 px-3 bg-[#111A2C] hover:bg-[#1A263D] border border-white/5 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95"
                                >
                                    {copiedLink ? (
                                        <>
                                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                                            <span className="text-emerald-400">Direct Link Copied!</span>
                                        </>
                                    ) : (
                                        <>
                                            <FileText className="w-3.5 h-3.5 text-orange-400" />
                                            <span>Copy Counter Direct URL</span>
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => setShowCounterQrModal(false)}
                                    className="py-2 px-4 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-bold transition-all active:scale-95"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}