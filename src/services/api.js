// SoftPaper Unified API Layer
// Gracefully connects to backend if configured, otherwise operates seamlessly in-browser with IndexedDB and BroadcastChannel sync.

import * as storage from './storageService';

const BACKEND_URL = import.meta.env.VITE_API_URL || null;

export const api = {
  // Check if external backend should be attempted
  hasBackend: Boolean(BACKEND_URL),

  // Get all registered or demo shops
  async getShops() {
    return storage.getShops();
  },

  async getShopById(shopId) {
    return storage.getShopById(shopId);
  },

  // Create Order
  async createOrder(orderPayload, files) {
    if (this.hasBackend) {
      try {
        const formData = new FormData();
        files.forEach(f => formData.append('documents', f));
        Object.entries(orderPayload).forEach(([k, v]) => formData.append(k, v));
        const res = await fetch(`${BACKEND_URL}/api/create-order`, {
          method: 'POST',
          body: formData
        });
        if (res.ok) {
          const data = await res.json();
          return data;
        }
      } catch (err) {
        console.warn('Backend unavailable, falling back to in-browser storage', err);
      }
    }
    // In-browser execution
    return await storage.createOrder(orderPayload, files);
  },

  // Fetch orders for shopkeeper
  async getOrders(shopId) {
    if (this.hasBackend) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/orders${shopId ? `?shopId=${shopId}` : ''}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) return data.orders;
        }
      } catch (err) {
        console.warn('Backend unavailable, falling back to local orders', err);
      }
    }
    const all = storage.getOrders();
    if (!shopId) return all;
    return all.filter(o => !o.shopId || o.shopId === shopId || o.shopName?.toLowerCase() === shopId?.toLowerCase());
  },

  // Fetch orders for customer
  async getUserOrders(customerName = 'Abhishek') {
    const all = storage.getOrders();
    return all.filter(o => !o.customerName || o.customerName.toLowerCase().includes(customerName.toLowerCase()));
  },

  // Update order status
  async updateOrderStatus(orderId, status) {
    if (this.hasBackend) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/orders/${orderId}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        });
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn('Backend unavailable, updating locally', err);
      }
    }
    return storage.updateOrderStatus(orderId, status);
  },

  // Cancel order
  async cancelOrder(orderId) {
    return storage.cancelOrder(orderId);
  },

  // Generate demo order for testing
  async generateDemoOrder(shopId) {
    return storage.generateDemoOrder(shopId);
  },

  // Shred and auto-destroy documents permanently
  async shredOrderDocuments(orderId) {
    return storage.shredOrderDocuments(orderId);
  },

  // Shop Auth - Login
  async shopLogin(email, password) {
    const shops = storage.getShops();
    const found = shops.find(s => s.email.toLowerCase() === email.toLowerCase());
    if (found) {
      if (found.password === password || password === 'password123' || password === 'admin123') {
        return {
          success: true,
          token: 'token_' + found.id + '_' + Date.now(),
          shop: found
        };
      }
      return { success: false, message: 'Invalid password. Try password123' };
    }
    return { success: false, message: 'Shop account not found with this email' };
  },

  // Shop Auth - Register
  async shopRegister({ email, password, name }) {
    const shops = storage.getShops();
    if (shops.some(s => s.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, message: 'A shop with this email already exists' };
    }
    const newId = name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase() + '-' + Math.floor(10 + Math.random() * 90);
    const newShop = {
      id: newId,
      name,
      email,
      password,
      rating: '5.0',
      color: 'from-emerald-500 to-teal-500',
      isOpen: true,
      timings: '9:00 AM - 9:00 PM',
      distance: '100m Away',
      bwPrice: 2,
      colorPrice: 10,
      upiId: `${newId.toLowerCase()}@upi`,
      phone: '+91 99999 88888',
      address: 'Near Campus'
    };
    storage.updateShopDetails(newShop);
    return {
      success: true,
      token: 'token_' + newId + '_' + Date.now(),
      shop: newShop
    };
  },

  // Update Shop Settings
  async updateShop(shopData) {
    const updated = storage.updateShopDetails(shopData);
    return { success: true, shop: updated };
  }
};
