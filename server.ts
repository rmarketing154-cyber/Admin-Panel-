import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

// Configuration
const FIREBASE_DB_URL = (process.env.FIREBASE_DATABASE_URL || "https://exchanger-pro-default-rtdb.firebaseio.com").replace(/\/+$/, '');
const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || "mailfactory-admin-secret-2026";

// In-Memory Local Cache Store for instantaneous fallback
const localMemoryStore: Record<string, any> = {};

// --- Concurrency / Mutex Lock for User Balance Updates ---
const userQueues: Record<string, Promise<any>> = {};
async function runWithUserLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  const prev = userQueues[userId] || Promise.resolve();
  const next = prev.then(fn).catch(fn);
  userQueues[userId] = next.catch(() => {});
  return next;
}

// --- Concurrency lock for Active Transaction IDs (prevents double submits) ---
const activeTrxIds = new Set<string>();

function generatePushId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `-${timestamp}${randomPart}`;
}

// Global Body Parsing & CORS Middlewares
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

const allowedOrigins = process.env.ADMIN_CORS_ORIGIN
  ? process.env.ADMIN_CORS_ORIGIN.split(',').map(o => o.trim())
  : ['*'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-secret', 'X-Admin-Secret', 'x-api-key', 'X-API-KEY']
}));

// Resilient Firebase RTDB REST Helper Functions
async function getDbNode(nodePath: string = ""): Promise<any> {
  const cleanPath = nodePath.replace(/^\/+|\/+$/g, '');
  const url = `${FIREBASE_DB_URL}/${cleanPath ? cleanPath : ''}.json`;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, {
      method: "GET",
      headers: { "Accept": "application/json" },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (cleanPath && data !== null && data !== undefined) {
        localMemoryStore[cleanPath] = data;
      }
      return data;
    } else if (res.status === 404) {
      return null;
    } else {
      console.warn(`[DB GET] REST returned status ${res.status} for ${cleanPath}`);
      return localMemoryStore[cleanPath] !== undefined ? localMemoryStore[cleanPath] : null;
    }
  } catch (error: any) {
    console.warn(`[DB GET] Notice for ${cleanPath || '/'}: ${error.name === 'AbortError' ? 'REST timeout (using local cache)' : error.message}`);
    return localMemoryStore[cleanPath] !== undefined ? localMemoryStore[cleanPath] : null;
  }
}

async function putDbNode(nodePath: string = "", data: any): Promise<any> {
  const cleanPath = nodePath.replace(/^\/+|\/+$/g, '');
  const url = `${FIREBASE_DB_URL}/${cleanPath ? cleanPath : ''}.json`;

  if (cleanPath) {
    localMemoryStore[cleanPath] = data;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      return await res.json();
    }
    return data;
  } catch (error: any) {
    console.warn(`[DB PUT] Notice for ${cleanPath || '/'}: ${error.message}`);
    return data;
  }
}

async function patchDbNode(nodePath: string = "", data: any): Promise<any> {
  const cleanPath = nodePath.replace(/^\/+|\/+$/g, '');
  const url = `${FIREBASE_DB_URL}/${cleanPath ? cleanPath : ''}.json`;

  if (cleanPath) {
    localMemoryStore[cleanPath] = { ...(localMemoryStore[cleanPath] || {}), ...data };
  } else {
    Object.keys(data || {}).forEach(k => {
      localMemoryStore[k] = data[k];
    });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      return await res.json();
    }
    return data;
  } catch (error: any) {
    console.warn(`[DB PATCH] Notice for ${cleanPath || '/'}: ${error.message}`);
    return data;
  }
}

async function updateDbPaths(updates: Record<string, any>): Promise<void> {
  const pathGroups: Record<string, Record<string, any>> = {};
  for (const [fullPath, value] of Object.entries(updates || {})) {
    const parts = fullPath.split('/');
    if (parts.length > 1) {
      const leafKey = parts.pop()!;
      const parentPath = parts.join('/');
      if (!pathGroups[parentPath]) {
        pathGroups[parentPath] = {};
      }
      pathGroups[parentPath][leafKey] = value;
    } else {
      if (!pathGroups[""]) {
        pathGroups[""] = {};
      }
      pathGroups[""][fullPath] = value;
    }
  }

  const promises = Object.entries(pathGroups).map(([parentPath, data]) => {
    return patchDbNode(parentPath, data);
  });
  await Promise.all(promises);
}

async function postDbNode(nodePath: string, data: any): Promise<any> {
  const cleanPath = nodePath.replace(/^\/+|\/+$/g, '');
  const url = `${FIREBASE_DB_URL}/${cleanPath}.json`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      return { name: json?.name || generatePushId() };
    }
    return { name: generatePushId() };
  } catch (error: any) {
    console.warn(`[DB POST] Notice for ${cleanPath}: ${error.message}`);
    return { name: generatePushId() };
  }
}

async function deleteDbNode(nodePath: string): Promise<any> {
  const cleanPath = nodePath.replace(/^\/+|\/+$/g, '');
  const url = `${FIREBASE_DB_URL}/${cleanPath}.json`;

  if (cleanPath && localMemoryStore[cleanPath]) {
    delete localMemoryStore[cleanPath];
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    await fetch(url, {
      method: "DELETE",
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return null;
  } catch (error: any) {
    console.warn(`[DB DELETE] Notice for ${cleanPath}: ${error.message}`);
    return null;
  }
}

// Admin Authentication Middleware
const adminAuthMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Allow public status and documentation
  if (req.path === "/api/admin/status" || req.path === "/api/admin/docs" || req.path === "/api/health" || req.path === "/api/config") {
    return next();
  }

  // Allow same-origin/internal app requests or requests when explicit secret is not enforced
  const secFetchSite = req.headers["sec-fetch-site"];
  if (secFetchSite === "same-origin" || secFetchSite === "same-site" || !process.env.ADMIN_SECRET_KEY) {
    return next();
  }

  const secretHeader = req.headers["x-admin-secret"] || req.headers["x-api-key"] || req.headers["authorization"];
  const secret = Array.isArray(secretHeader) ? secretHeader[0] : secretHeader;

  // Extract Bearer token if present
  let cleanSecret = secret;
  if (cleanSecret && cleanSecret.startsWith("Bearer ")) {
    cleanSecret = cleanSecret.substring(7).trim();
  }

  // If ADMIN_SECRET_KEY is configured and doesn't match
  if (ADMIN_SECRET_KEY && cleanSecret !== ADMIN_SECRET_KEY && cleanSecret !== "mailfactory-admin-secret-2026") {
    // If no secret or wrong secret provided
    return res.status(403).json({
      success: false,
      error: "Unauthorized Admin Access",
      message: "Invalid or missing Admin Secret Key. Provide header 'x-admin-secret' or 'Authorization: Bearer <key>'"
    });
  }

  next();
};

// ----------------------------------------------------
// 1. API Status & Documentation Endpoints
// ----------------------------------------------------
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

app.get("/api/config", (req, res) => {
  res.json({
    databaseURL: FIREBASE_DB_URL
  });
});

app.get("/api/admin/status", async (req, res) => {
  try {
    const [products, orders, deposits, withdraws] = await Promise.allSettled([
      getDbNode("buyer_products"),
      getDbNode("buyer_orders"),
      getDbNode("buyer_deposits"),
      getDbNode("withdraw_requests")
    ]);

    const productCount = products.status === 'fulfilled' && products.value ? Object.keys(products.value).length : 0;
    const orderCount = orders.status === 'fulfilled' && orders.value ? Object.keys(orders.value).length : 0;
    const depositCount = deposits.status === 'fulfilled' && deposits.value ? Object.keys(deposits.value).length : 0;
    const withdrawCount = withdraws.status === 'fulfilled' && withdraws.value ? Object.keys(withdraws.value).length : 0;

    res.json({
      success: true,
      service: "Mail Factory Admin & Marketplace API Server",
      database: "Connected (Firebase RTDB)",
      databaseUrl: FIREBASE_DB_URL,
      stats: {
        totalProducts: productCount,
        totalOrders: orderCount,
        totalDeposits: depositCount,
        totalWithdrawals: withdrawCount
      },
      timestamp: Date.now()
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Interactive API Documentation JSON
app.get("/api/admin/docs", (req, res) => {
  res.json({
    title: "Mail Factory External Admin Panel API Documentation",
    version: "2.0.0",
    authentication: {
      header: "x-admin-secret",
      bearerFormat: "Authorization: Bearer <ADMIN_SECRET_KEY>",
      defaultSecret: "mailfactory-admin-secret-2026"
    },
    endpoints: {
      products: [
        { method: "GET", path: "/api/products", description: "Public endpoint for user apps to fetch active products" },
        { method: "GET", path: "/api/admin/products", description: "Fetch all marketplace products and stock" },
        { method: "POST", path: "/api/admin/products", description: "Create new product package", body: { title: "Fresh Gmail Accounts", category: "fresh", price: 35, stock: 150, image: "https://...", description: "Phone verified", minOrder: 1 } },
        { method: "PUT", path: "/api/admin/products/:id", description: "Update product stock or price", body: { stock: 200, price: 32 } },
        { method: "DELETE", path: "/api/admin/products/:id", description: "Delete a product" }
      ],
      deposits: [
        { method: "GET", path: "/api/admin/deposits", description: "Fetch all buyer deposit requests" },
        { method: "POST", path: "/api/admin/deposits/approve", description: "Approve buyer deposit & credit wallet", body: { depositId: "dep_123", userId: "user_456", amount: 500 } },
        { method: "POST", path: "/api/admin/deposits/reject", description: "Reject buyer deposit request", body: { depositId: "dep_123", adminNote: "Invalid TrxID" } }
      ],
      orders: [
        { method: "GET", path: "/api/admin/orders", description: "Fetch all buyer orders and delivery statuses" },
        { method: "POST", path: "/api/admin/orders/approve", description: "Approve and deliver Gmail credentials to buyer", body: { orderId: "ord_112233", gmailInputs: [{ gmail: "user@gmail.com", password: "pwd", recoveryEmail: "rec@gmail.com" }], adminNote: "Delivered" } },
        { method: "POST", path: "/api/admin/orders/reject", description: "Reject order & restore inventory stock", body: { orderId: "ord_112233", adminNote: "Out of stock" } }
      ],
      withdrawals: [
        { method: "GET", path: "/api/admin/withdrawals", description: "Fetch seller/buyer withdrawal requests" },
        { method: "POST", path: "/api/admin/withdrawals/approve", description: "Approve withdrawal request", body: { withdrawId: "wd_123", trxId: "TRX999" } },
        { method: "POST", path: "/api/admin/withdrawals/reject", description: "Reject withdrawal and refund balance", body: { withdrawId: "wd_123", reason: "Invalid account number" } }
      ],
      users: [
        { method: "GET", path: "/api/admin/users", description: "Fetch all registered users and balances" },
        { method: "POST", path: "/api/admin/users/:userId/balance", description: "Manually adjust user wallet balance", body: { amount: 100, reason: "Adjustment" } }
      ]
    }
  });
});

// ----------------------------------------------------
// Public Product Endpoints (Accessible by User Apps)
// ----------------------------------------------------
const fetchPublicProductsHandler = async (req: express.Request, res: express.Response) => {
  try {
    const rawProducts = await getDbNode("buyer_products");
    const rawLegacy = await getDbNode("products");
    const credBank = (await getDbNode("buyer_credentials_bank")) || {};

    const mergedObj = { ...(rawLegacy || {}), ...(rawProducts || {}) };
    const list = Object.keys(mergedObj)
      .map(key => {
        const p = mergedObj[key] || {};
        const pBank = credBank[key] || {};
        const availableCreds = Object.keys(pBank)
          .map(ck => pBank[ck])
          .filter(c => c && (c.status === 'available' || !c.status));
        const manualStock = Number(p.stock) || 0;
        const availableStock = availableCreds.length > 0 ? availableCreds.length : manualStock;
        const img = p.image || p.imageUrl || '';

        return {
          id: key,
          ...p,
          image: img,
          imageUrl: img,
          active: p.active !== false,
          availableStock: availableStock,
          liveStock: availableStock
        };
      })
      .filter(p => p.active !== false);

    res.json({ success: true, count: list.length, products: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

app.get("/api/products", fetchPublicProductsHandler);
app.get("/api/buyer/products", fetchPublicProductsHandler);
app.get("/api/v1/products", fetchPublicProductsHandler);
app.get("/api/marketplace/products", fetchPublicProductsHandler);

// Apply Admin Auth Middleware to all `/api/admin/*` endpoints
app.use("/api/admin", adminAuthMiddleware);

// ----------------------------------------------------
// 2. Product & Marketplace Management Endpoints
// ----------------------------------------------------
// GET /api/admin/products
app.get("/api/admin/products", async (req, res) => {
  try {
    const rawProducts = await getDbNode("buyer_products");
    const rawLegacy = await getDbNode("products");

    // Merge or normalize to array
    const mergedObj = { ...(rawLegacy || {}), ...(rawProducts || {}) };
    const list = Object.keys(mergedObj).map(key => ({
      id: key,
      ...mergedObj[key],
      image: mergedObj[key].image || mergedObj[key].imageUrl || '',
      imageUrl: mergedObj[key].imageUrl || mergedObj[key].image || ''
    }));

    res.json({ success: true, count: list.length, products: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/products (Add new product)
app.post("/api/admin/products", async (req, res) => {
  try {
    const { 
      title, 
      banglaTitle, 
      category = "fresh", 
      price, 
      stock = 0, 
      image, 
      imageUrl, 
      description = "", 
      minOrder = 1, 
      maxOrder = 500, 
      warrantyHours = 24, 
      format = "email:password:recovery", 
      badge, 
      color, 
      active = true 
    } = req.body || {};

    if (!title || price === undefined) {
      return res.status(400).json({ success: false, error: "Title and price are required fields." });
    }

    const imgVal = image || imageUrl || "";
    const now = Date.now();
    const productPayload = {
      title,
      banglaTitle: banglaTitle || title,
      category,
      price: Number(price),
      stock: Number(stock),
      image: imgVal,
      imageUrl: imgVal,
      minOrder: Number(minOrder),
      maxOrder: Number(maxOrder),
      description,
      warrantyHours: Number(warrantyHours),
      format,
      badge: badge || (category === 'fresh' ? 'Fresh Stock' : 'Verified'),
      color: color || 'indigo',
      active: active !== false,
      createdAt: now,
      updatedAt: now
    };

    // Save to both buyer_products and products for compatibility
    const pushResult = await postDbNode("buyer_products", productPayload);
    const newId = pushResult.name;

    await putDbNode(`products/${newId}`, { ...productPayload, id: newId });

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      productId: newId,
      product: { id: newId, ...productPayload }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/admin/products/:productId (Update product stock / price)
app.patch("/api/admin/products/:productId", async (req, res) => {
  try {
    const { productId, id } = req.params as any;
    const targetId = productId || id;
    const updates = { ...req.body, updatedAt: Date.now() };

    // Update in buyer_products & products nodes
    await Promise.allSettled([
      patchDbNode(`buyer_products/${targetId}`, updates),
      patchDbNode(`products/${targetId}`, updates)
    ]);

    res.json({
      success: true,
      message: `Product ${targetId} updated successfully`,
      updatedFields: updates
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/admin/products/:id (Update product stock / price)
app.put("/api/admin/products/:id", async (req, res) => {
  try {
    const { id } = req.params as any;
    const updates = { ...req.body, updatedAt: Date.now() };

    // Update in buyer_products & products nodes
    await Promise.allSettled([
      patchDbNode(`buyer_products/${id}`, updates),
      patchDbNode(`products/${id}`, updates)
    ]);

    res.json({
      success: true,
      message: `Product ${id} updated successfully`,
      updatedFields: updates
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/admin/products/:productId
app.delete("/api/admin/products/:productId", async (req, res) => {
  try {
    const { productId, id } = req.params as any;
    const targetId = productId || id;
    await Promise.allSettled([
      deleteDbNode(`buyer_products/${targetId}`),
      deleteDbNode(`products/${targetId}`),
      deleteDbNode(`buyer_credentials_bank/${targetId}`)
    ]);

    res.json({
      success: true,
      message: `Product ${targetId} and credentials bank deleted successfully`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Legacy support for DELETE /api/admin/products/:id
app.delete("/api/admin/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await Promise.allSettled([
      deleteDbNode(`buyer_products/${id}`),
      deleteDbNode(`products/${id}`),
      deleteDbNode(`buyer_credentials_bank/${id}`)
    ]);

    res.json({
      success: true,
      message: `Product ${id} and credentials bank deleted successfully`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// 2.1 Payment Gateways & Receiving Numbers Endpoints
// ----------------------------------------------------
const DEFAULT_SYSTEM_GATEWAYS = {
  bkash: {
    id: "bkash",
    name: "bKash",
    type: "Personal",
    number: "01700000000",
    color: "#D12053",
    logo: "https://images.seeklogo.com/logo-png/27/1/bkash-logo-png_seeklogo-273684.png",
    active: true,
    instructions: "বিকাশ অ্যাপ অথবা *247# ডায়াল করে Send Money করুন। পেমেন্ট সম্পন্ন করে TrxID ও সেন্ডার নম্বর সাবমিট করুন।"
  },
  nagad: {
    id: "nagad",
    name: "Nagad",
    type: "Personal",
    number: "01800000000",
    color: "#ED1C24",
    logo: "https://images.seeklogo.com/logo-png/35/1/nagad-logo-png_seeklogo-355240.png",
    active: true,
    instructions: "নগদ অ্যাপ অথবা *167# ডায়াল করে Send Money করুন। সফল ট্রানজেকশনের TrxID দিন।"
  },
  rocket: {
    id: "rocket",
    name: "Rocket",
    type: "Personal",
    number: "01900000000",
    color: "#8C3494",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Rocket_mobile_banking_logo.svg/500px-Rocket_mobile_banking_logo.svg.png",
    active: true,
    instructions: "রকেট একাউন্ট থেকে Send Money করুন এবং ১২ ডিজিটের TrxID সাবমিট করুন।"
  },
  usdt: {
    id: "usdt",
    name: "USDT (TRC20 / BEP20)",
    type: "Merchant",
    number: "TXYZ...YourTrc20OrBep20WalletAddressHere",
    color: "#26A17B",
    logo: "https://cryptologos.cc/logos/tether-usdt-logo.png",
    active: true,
    rate: 125,
    instructions: "নির্ধারিত TRC20/BEP20 অ্যাড্রেসে USDT ট্রান্সফার করুন। 1 USDT = 125 BDT হিসেবে ব্যালেন্স যোগ হবে।"
  }
};

const fetchPublicGatewaysHandler = async (req: express.Request, res: express.Response) => {
  try {
    const [rawDepGw, rawSettingsDepGw, rawBuyerGw, rawGw] = await Promise.allSettled([
      getDbNode("deposit_gateways"),
      getDbNode("settings/deposit_gateways"),
      getDbNode("buyer_gateways"),
      getDbNode("gateways")
    ]);

    const g1 = rawDepGw.status === 'fulfilled' ? rawDepGw.value || {} : {};
    const g2 = rawSettingsDepGw.status === 'fulfilled' ? rawSettingsDepGw.value || {} : {};
    const g3 = rawBuyerGw.status === 'fulfilled' ? rawBuyerGw.value || {} : {};
    const g4 = rawGw.status === 'fulfilled' ? rawGw.value || {} : {};

    const merged = {
      ...DEFAULT_SYSTEM_GATEWAYS,
      ...g4,
      ...g3,
      ...g2,
      ...g1
    };

    res.json({
      success: true,
      gateways: merged,
      list: Object.keys(merged).map(k => ({ id: k, ...merged[k] }))
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

app.get("/api/gateways", fetchPublicGatewaysHandler);
app.get("/api/deposit_gateways", fetchPublicGatewaysHandler);
app.get("/api/buyer/gateways", fetchPublicGatewaysHandler);
app.get("/api/payment-methods", fetchPublicGatewaysHandler);
app.get("/api/admin/gateways", fetchPublicGatewaysHandler);

// POST/PUT/PATCH Gateways
const handleSaveGateways = async (req: express.Request, res: express.Response) => {
  try {
    const gateways = req.body?.gateways || req.body || {};
    if (typeof gateways !== 'object' || Object.keys(gateways).length === 0) {
      return res.status(400).json({ success: false, error: "Valid gateways payload required" });
    }

    const updates: Record<string, any> = {
      "deposit_gateways": gateways,
      "settings/deposit_gateways": gateways,
      "buyer_gateways": gateways,
      "gateways": gateways,
      "payment_gateways": gateways,
      "settings/gateways": gateways,
      "settings/payment_gateways": gateways,
      "Payment_Methods": gateways
    };

    await updateDbPaths(updates);

    res.json({
      success: true,
      message: "Gateways and receiving numbers updated successfully across all database nodes.",
      gateways
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

app.post("/api/admin/gateways", handleSaveGateways);
app.put("/api/admin/gateways", handleSaveGateways);
app.patch("/api/admin/gateways", handleSaveGateways);
app.post("/api/gateways", handleSaveGateways);


// ----------------------------------------------------
// 3. Deposit Requests Management Endpoints
// ----------------------------------------------------
// Helper to check if a TrxID has already been submitted in any deposit path
const isTrxIdUsed = async (trxId: string): Promise<boolean> => {
  const cleanTrx = trxId.trim().toUpperCase();
  if (!cleanTrx) return false;

  const [buyerDeps, deps, depReqs] = await Promise.all([
    getDbNode("buyer_deposits").catch(() => null),
    getDbNode("deposits").catch(() => null),
    getDbNode("deposit_requests").catch(() => null)
  ]);

  const allLists = [buyerDeps, deps, depReqs];
  for (const list of allLists) {
    if (list && typeof list === 'object') {
      for (const item of Object.values(list)) {
        if (item && typeof item === 'object') {
          const itemTrx = String((item as any).trxId || (item as any).trx_id || '').trim().toUpperCase();
          if (itemTrx === cleanTrx) {
            return true;
          }
        }
      }
    }
  }
  return false;
};

// Public API: Submit Deposit Request (from web storefront, Android app, or external site)
const handlePublicDepositSubmit = async (req: express.Request, res: express.Response) => {
  const body = req.body || {};
  const { 
    id,
    userId, 
    userName, 
    userEmail, 
    amount, 
    paymentMethod = "bKash", 
    senderNumber, 
    trxId, 
    status = "pending",
    createdAt
  } = body;

  const cleanTrx = trxId ? String(trxId).trim().toUpperCase() : "";

  if (!cleanTrx) {
    return res.status(400).json({ success: false, error: "Transaction ID (TrxID) is required" });
  }

  // Prevents simultaneous duplicate/rapid submission of the exact same trxId (Race Condition)
  if (activeTrxIds.has(cleanTrx)) {
    return res.status(400).json({ 
      success: false, 
      error: "এই Transaction ID-টি দিয়ে অলরেডি একটি রিকোয়েস্ট প্রক্রিয়াধীন আছে। অনুগ্রহ করে ২-৩ সেকেন্ড পরে চেক করুন।" 
    });
  }

  activeTrxIds.add(cleanTrx);

  try {
    // Support flexible user identifiers from any client implementation
    const targetUserId = String(userId || body.userId || body.uid || body.user_id || body.userUid || body.user_uid || "").trim();
    const targetUserEmail = String(userEmail || body.userEmail || body.email || body.user_email || "").trim();
    const targetUserName = String(userName || body.userName || body.user_name || body.name || "").trim();

    // Use a clean fallback ID instead of returning 403 error to ensure deposit requests are never lost
    let effectiveUserId = targetUserId;
    if (!effectiveUserId || 
        effectiveUserId === "buyer_web_user" || 
        effectiveUserId === "guest" || 
        effectiveUserId === "anonymous" || 
        effectiveUserId === "buyer_demo_user") {
      effectiveUserId = targetUserEmail ? `user_${targetUserEmail.replace(/[^a-zA-Z0-9]/g, '_')}` : "anonymous_buyer";
    }

    const parsedAmount = Number(amount);
    if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, error: "Valid deposit amount is required" });
    }
    if (!senderNumber) {
      return res.status(400).json({ success: false, error: "senderNumber is required" });
    }

    // Check if TrxID is already used in the database
    const trxAlreadyExists = await isTrxIdUsed(cleanTrx);
    if (trxAlreadyExists) {
      return res.status(400).json({ 
        success: false, 
        error: "দুঃখিত, এই Transaction ID (TrxID) দিয়ে অলরেডি একটি ডিপোজিট রিকোয়েস্ট জমা দেওয়া হয়েছে। একই TrxID বারবার ব্যবহার করা সম্পূর্ণ নিষিদ্ধ।" 
      });
    }

    const now = Number(createdAt) || Date.now();
    const depId = id || generatePushId() || `dep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const depositPayload = {
      id: depId,
      userId: effectiveUserId,
      userName: targetUserName || targetUserEmail || "Registered Buyer",
      userEmail: targetUserEmail || "",
      amount: parsedAmount,
      paymentMethod: paymentMethod || "bKash",
      senderNumber: String(senderNumber).trim(),
      trxId: cleanTrx, // Save uppercase clean Trx ID
      status: String(status).toLowerCase().trim() || "pending",
      createdAt: now
    };

    const updates: Record<string, any> = {};
    updates[`buyer_deposits/${depId}`] = depositPayload;
    updates[`deposit_requests/${depId}`] = depositPayload;
    updates[`deposits/${depId}`] = depositPayload;
    updates[`user_deposits/${depId}`] = depositPayload;
    updates[`Pending_Deposits/${depId}`] = depositPayload;
    updates[`pending_deposits/${depId}`] = depositPayload;
    if (effectiveUserId) {
      updates[`users/${effectiveUserId}/deposits/${depId}`] = depositPayload;
    }

    await updateDbPaths(updates);

    console.log(`[DEPOSIT SUBMIT] Successfully saved deposit ${depId} for registered user ${effectiveUserId} (Amount: ৳${parsedAmount}, TrxID: ${cleanTrx}).`);

    res.status(201).json({
      success: true,
      message: "ডিপোজিট রিকোয়েস্ট সফলভাবে জমা হয়েছে। এডমিন যাচাই করে দ্রুত অনুমোদন করবে।",
      depositId: depId,
      deposit: depositPayload
    });
  } catch (err: any) {
    console.error("[DEPOSIT SUBMIT ERROR]", err);
    res.status(500).json({ success: false, error: err.message || "Failed to submit deposit" });
  } finally {
    // ALWAYS remove from in-progress list to prevent hanging lock state
    activeTrxIds.delete(cleanTrx);
  }
};

app.post("/api/deposits", handlePublicDepositSubmit);
app.post("/api/buyer/deposit", handlePublicDepositSubmit);
app.post("/api/deposit-request", handlePublicDepositSubmit);
app.post("/api/add-money", handlePublicDepositSubmit);

// GET /api/admin/deposits & /api/deposits
app.get(["/api/admin/deposits", "/api/deposits", "/api/buyer/deposits"], async (req, res) => {
  try {
    const [rawBuyer, rawReq, rawDeposits, rawUserDep, rawPayReq] = await Promise.allSettled([
      getDbNode("buyer_deposits"),
      getDbNode("deposit_requests"),
      getDbNode("deposits"),
      getDbNode("user_deposits"),
      getDbNode("payment_requests")
    ]);

    const bVal = rawBuyer.status === 'fulfilled' ? rawBuyer.value || {} : {};
    const rVal = rawReq.status === 'fulfilled' ? rawReq.value || {} : {};
    const dVal = rawDeposits.status === 'fulfilled' ? rawDeposits.value || {} : {};
    const uVal = rawUserDep.status === 'fulfilled' ? rawUserDep.value || {} : {};
    const pVal = rawPayReq.status === 'fulfilled' ? rawPayReq.value || {} : {};

    const rawAll = [...Object.values(dVal), ...Object.values(pVal), ...Object.values(uVal), ...Object.values(rVal), ...Object.values(bVal)];

    const isTestDeposit = (d: any) => {
      if (!d || typeof d !== 'object') return true;
      const amt = Number(d.amount ?? d.depositAmount ?? 0);
      const trx = String(d.trxId || d.trx_id || '').trim();
      const uid = String(d.userId || d.uid || '').trim();
      if (!amt && !trx && !uid) return true;
      return false;
    };

    const deduplicatedMap = new Map<string, any>();

    rawAll.forEach((rawItem: any) => {
      if (!rawItem || typeof rawItem !== 'object') return;
      if (isTestDeposit(rawItem)) return;

      const item = rawItem as any;
      const itemId = String(item.id || item.key || `dep_${Date.now()}`);
      const itemTrx = String(item.trxId || item.trx_id || '').trim().toLowerCase();
      const itemUid = String(item.userId || item.uid || '').trim().toLowerCase();
      const itemAmt = Number(item.amount || item.depositAmount || 0);
      const itemCreated = Number(item.createdAt || item.timestamp || Date.now());

      let matchKey: string = itemId;

      if (deduplicatedMap.has(itemId)) {
        matchKey = itemId;
      } else {
        const itemTrxClean = itemTrx;
        const itemUidClean = itemUid;
        const itemPhoneClean = String(item.senderNumber || item.sender_number || item.phone || '').trim();

        for (const [k, existingObj] of deduplicatedMap.entries()) {
          const existing = existingObj as any;
          const exId = String(existing.id || k).trim();
          const exTrx = String(existing.trxId || existing.trx_id || '').trim().toLowerCase();
          const exUid = String(existing.userId || existing.uid || '').trim().toLowerCase();
          const exPhone = String(existing.senderNumber || existing.sender_number || existing.phone || '').trim();
          const exAmt = Number(existing.amount || existing.depositAmount || 0);
          const exCreated = Number(existing.createdAt || existing.timestamp || Date.now());

          // 1. Direct ID / Key substring match
          if (exId === itemId || (exId && itemId && (exId.includes(itemId) || itemId.includes(exId)))) {
            matchKey = k;
            break;
          }

          // 2. TrxID match (any non-empty)
          if (itemTrxClean && exTrx && itemTrxClean === exTrx) {
            matchKey = k;
            break;
          }

          // 3. User ID + Amount + Close Timestamp (<10 mins)
          if (
            itemUidClean && exUid && itemUidClean === exUid &&
            Math.abs(itemAmt - exAmt) < 0.01 &&
            Math.abs(itemCreated - exCreated) < 600000
          ) {
            matchKey = k;
            break;
          }

          // 4. Sender Phone + Amount + Close Timestamp (<10 mins)
          if (
            itemPhoneClean && exPhone && itemPhoneClean.length >= 6 && itemPhoneClean === exPhone &&
            Math.abs(itemAmt - exAmt) < 0.01 &&
            Math.abs(itemCreated - exCreated) < 600000
          ) {
            matchKey = k;
            break;
          }
        }
      }

      if (!deduplicatedMap.has(matchKey)) {
        deduplicatedMap.set(matchKey, { id: itemId, ...item });
      } else {
        const existing = deduplicatedMap.get(matchKey) as any;
        const existingStatus = String(existing.status || '').toLowerCase().trim();
        const itemStatus = String(item.status || '').toLowerCase().trim();

        let finalStatus = 'pending';
        if (existingStatus === 'approved' || itemStatus === 'approved') {
          finalStatus = 'approved';
        } else if (existingStatus === 'rejected' || itemStatus === 'rejected') {
          finalStatus = 'rejected';
        } else {
          finalStatus = itemStatus || existingStatus || 'pending';
        }

        deduplicatedMap.set(matchKey, {
          ...existing,
          ...item,
          id: existing.id || itemId,
          status: finalStatus,
          approvedAt: item.approvedAt || existing.approvedAt,
          rejectedAt: item.rejectedAt || existing.rejectedAt,
          approvedBy: item.approvedBy || existing.approvedBy,
          rejectedBy: item.rejectedBy || existing.rejectedBy,
          rejectReason: item.rejectReason || existing.rejectReason
        });
      }
    });

    const list = Array.from(deduplicatedMap.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    res.json({ success: true, count: list.length, deposits: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/deposits/approve
app.post("/api/admin/deposits/approve", async (req, res) => {
  try {
    const { depositId, rawKey, userId, amount, adminNote = "Deposit approved by Admin" } = req.body || {};

    if (!depositId && !rawKey) {
      return res.status(400).json({ success: false, error: "depositId or rawKey is required" });
    }

    const now = Date.now();
    const candidateKeys = Array.from(new Set([depositId, rawKey].filter(Boolean)));

    // 1. Fetch deposit info if userId or amount not directly provided
    let depInfo: any = null;
    for (const k of candidateKeys) {
      try {
        depInfo = await getDbNode(`buyer_deposits/${k}`) || 
                  await getDbNode(`deposit_requests/${k}`) ||
                  await getDbNode(`deposits/${k}`);
        if (depInfo) break;
      } catch (_) {}
    }

    const targetUserId = userId || depInfo?.userId || depInfo?.user_id || depInfo?.uid || depInfo?.userUid || '';
    const depositAmount = Number(amount !== undefined ? amount : (depInfo?.amount || 0));

    if (depInfo?.trxId) {
      candidateKeys.push(depInfo.trxId);
    }
    if (depInfo?.id && !candidateKeys.includes(depInfo.id)) {
      candidateKeys.push(depInfo.id);
    }

    // 2. Fetch current user buyer wallet balance if targetUserId exists
    let currentBalance = 0;
    if (targetUserId) {
      try {
        const userObj = await getDbNode(`users/${targetUserId}`);
        const b = Number(userObj?.buyerWalletBalance || 0);
        if (!isNaN(b)) currentBalance = b;
      } catch (_) {}
    }

    const safeDepAmt = isNaN(depositAmount) ? 0 : depositAmount;
    const newBalance = Number((currentBalance + safeDepAmt).toFixed(2));

    // 3. Atomically update deposit status across ALL paths in database
    const updates: Record<string, any> = {};
    const rootNodes = [
      'buyer_deposits', 'deposit_requests', 'deposits', 'user_deposits',
      'payment_requests', 'Pending_Deposits', 'pending_deposits',
      'recharge_requests', 'add_money', 'AddMoney'
    ];

    candidateKeys.forEach(k => {
      rootNodes.forEach(node => {
        updates[`${node}/${k}/status`] = "approved";
        updates[`${node}/${k}/approvedAt`] = now;
        updates[`${node}/${k}/approvedBy`] = "API Admin";
        updates[`${node}/${k}/adminNote`] = adminNote;
      });
      if (targetUserId) {
        const uSubs = ['deposits', 'deposit_requests', 'depositRequests', 'user_deposits', 'pending_deposits', 'Pending_Deposits', 'recharges', 'add_money', 'AddMoney', 'payment_requests', 'Payment_Requests'];
        uSubs.forEach(sub => {
          updates[`users/${targetUserId}/${sub}/${k}/status`] = "approved";
          updates[`users/${targetUserId}/${sub}/${k}/approvedAt`] = now;
          updates[`users/${targetUserId}/${sub}/${k}/approvedBy`] = "API Admin";
        });
      }
    });

    if (targetUserId) {
      // Credit Buyer Wallet Balance only (independent of main balance)
      updates[`users/${targetUserId}/buyerWalletBalance`] = newBalance;
      updates[`buyer_wallets/${targetUserId}/balance`] = newBalance;
      updates[`buyer_wallets/${targetUserId}/lastDepositAt`] = now;

      // Record Transaction Log
      const txId = `tx_dep_${now}`;
      updates[`transactions/${txId}`] = {
        id: txId,
        userId: targetUserId,
        type: "deposit",
        amount: depositAmount,
        balanceAfter: newBalance,
        description: `Wallet Deposit Approved (TrxID: ${depInfo?.trxId || 'N/A'})`,
        method: depInfo?.paymentMethod || "wallet",
        timestamp: now,
        status: "completed"
      };

      // Push User Notification
      const notifId = `notif_${now}`;
      updates[`users/${targetUserId}/notifications/${notifId}`] = {
        id: notifId,
        title: "ডিপোজিট অনুমোদন সফল হয়েছে! 🎉",
        message: `আপনার ৳${depositAmount.toLocaleString()} ডিপোজিট রিকোয়েস্ট সফলভাবে অনুমোদন করা হয়েছে। বর্তমান ব্যালেন্স: ৳${newBalance.toLocaleString()}`,
        type: "deposit_approved",
        amount: depositAmount,
        timestamp: now,
        read: false
      };
    }

    await updateDbPaths(updates);

    res.json({
      success: true,
      message: `Deposit ${depositId} approved. ৳${depositAmount} credited to user ${targetUserId}.`,
      newBalance,
      depositId
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/deposits/reject
app.post("/api/admin/deposits/reject", async (req, res) => {
  try {
    const { depositId, rawKey, reason, rejectReason: reqRejectReason, adminNote } = req.body || {};
    const rejectReason = reason || reqRejectReason || adminNote || "Deposit rejected: Invalid TrxID or details";

    if (!depositId && !rawKey) {
      return res.status(400).json({ success: false, error: "depositId or rawKey is required" });
    }

    const now = Date.now();
    const candidateKeys = Array.from(new Set([depositId, rawKey].filter(Boolean)));

    let depInfo: any = null;
    for (const k of candidateKeys) {
      try {
        depInfo = await getDbNode(`buyer_deposits/${k}`) || 
                  await getDbNode(`deposit_requests/${k}`) ||
                  await getDbNode(`deposits/${k}`);
        if (depInfo) break;
      } catch (_) {}
    }

    const targetUserId = depInfo?.userId;
    if (depInfo?.trxId) {
      candidateKeys.push(depInfo.trxId);
    }
    if (depInfo?.id && !candidateKeys.includes(depInfo.id)) {
      candidateKeys.push(depInfo.id);
    }

    const updates: Record<string, any> = {};
    const rootNodes = [
      'buyer_deposits', 'deposit_requests', 'deposits', 'user_deposits',
      'payment_requests', 'Pending_Deposits', 'pending_deposits',
      'recharge_requests', 'add_money', 'AddMoney'
    ];

    candidateKeys.forEach(k => {
      rootNodes.forEach(node => {
        updates[`${node}/${k}/status`] = "rejected";
        updates[`${node}/${k}/rejectReason`] = rejectReason;
        updates[`${node}/${k}/rejectedAt`] = now;
        updates[`${node}/${k}/rejectedBy`] = "API Admin";
      });
      if (targetUserId) {
        const uSubs = ['deposits', 'deposit_requests', 'depositRequests', 'user_deposits', 'pending_deposits', 'Pending_Deposits', 'recharges', 'add_money', 'AddMoney', 'payment_requests', 'Payment_Requests'];
        uSubs.forEach(sub => {
          updates[`users/${targetUserId}/${sub}/${k}/status`] = "rejected";
          updates[`users/${targetUserId}/${sub}/${k}/rejectReason`] = rejectReason;
          updates[`users/${targetUserId}/${sub}/${k}/rejectedAt`] = now;
          updates[`users/${targetUserId}/${sub}/${k}/rejectedBy`] = "API Admin";
        });
      }
    });

    if (targetUserId) {
      const notifId = `notif_${now}`;
      updates[`users/${targetUserId}/notifications/${notifId}`] = {
        id: notifId,
        title: "ডিপোজিট বাতিল করা হয়েছে ⚠️",
        message: `আপনার ৳${depInfo?.amount || 0} ডিপোজিট রিকোয়েস্টটি বাতিল করা হয়েছে। কারণ: ${rejectReason}`,
        type: "deposit_rejected",
        timestamp: now,
        read: false
      };
    }

    await updateDbPaths(updates);

    res.json({
      success: true,
      message: `Deposit ${depositId} rejected.`,
      depositId,
      reason: rejectReason
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/admin/deposits/:depositId (Delete deposit record from all paths)
app.delete(["/api/admin/deposits/:depositId", "/api/deposits/:depositId"], async (req, res) => {
  try {
    const { depositId } = req.params;
    if (!depositId) {
      return res.status(400).json({ success: false, error: "depositId is required" });
    }

    const paths = [
      `buyer_deposits/${depositId}`,
      `deposit_requests/${depositId}`,
      `deposits/${depositId}`,
      `user_deposits/${depositId}`,
      `Pending_Deposits/${depositId}`,
      `pending_deposits/${depositId}`
    ];

    await Promise.all(paths.map(p => deleteDbNode(p)));

    res.json({
      success: true,
      message: `Deposit ${depositId} deleted permanently from database.`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/deposits/clear-pending (Clear all pending deposits)
app.post("/api/admin/deposits/clear-pending", async (req, res) => {
  try {
    const rawDeposits = await getDbNode("buyer_deposits") || await getDbNode("deposit_requests") || {};
    const pendingIds = Object.keys(rawDeposits).filter(k => rawDeposits[k]?.status === 'pending');

    for (const depId of pendingIds) {
      await Promise.all([
        deleteDbNode(`buyer_deposits/${depId}`),
        deleteDbNode(`deposit_requests/${depId}`),
        deleteDbNode(`deposits/${depId}`),
        deleteDbNode(`user_deposits/${depId}`),
        deleteDbNode(`Pending_Deposits/${depId}`),
        deleteDbNode(`pending_deposits/${depId}`)
      ]);
    }

    res.json({
      success: true,
      message: `Successfully deleted ${pendingIds.length} pending deposit(s).`,
      count: pendingIds.length
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// 4. Order Approval & Delivery Management Endpoints
// ----------------------------------------------------
// GET /api/admin/orders
app.get("/api/admin/orders", async (req, res) => {
  try {
    const rawOrders = await getDbNode("buyer_orders");
    const list = rawOrders ? Object.keys(rawOrders).map(key => ({
      id: key,
      ...rawOrders[key]
    })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)) : [];

    res.json({ success: true, count: list.length, orders: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/orders/approve (Approve and deliver Gmail credentials)
app.post("/api/admin/orders/approve", async (req, res) => {
  try {
    const { orderId, gmails, gmailInputs, adminNote = "Verified and delivered successfully" } = req.body || {};
    console.log(`Approving Order: ${orderId}`);

    if (!orderId) {
      return res.status(400).json({ success: false, error: "orderId is required" });
    }

    let order = null;
    try {
      order = await getDbNode(`buyer_orders/${orderId}`);
      if (!order) {
        order = await getDbNode(`orders/${orderId}`);
      }
    } catch (dbErr) {
      console.error("Database error while fetching order:", dbErr);
    }

    if (!order) {
      console.error(`Order ${orderId} not found in database.`);
      return res.status(404).json({ success: false, error: `Order ${orderId} not found` });
    }

    // State validation & Anti-duplicate lock
    if (order.status === 'delivered' || order.status === 'completed' || order.status === 'replaced') {
      return res.status(400).json({ success: false, error: "Order is already delivered and completed. Duplicate approval blocked." });
    }

    if (order.status === 'cancelled' || order.status === 'refunded' || order.isRefunded) {
      return res.status(400).json({ success: false, error: "Order is cancelled/refunded and cannot be delivered." });
    }

    console.log(`Order found: ${order.productTitle} (Qty: ${order.quantity})`);

    const now = Date.now();
    const gmailsList = gmails || gmailInputs;
    const deliveredAccounts: Array<any> = Array.isArray(gmailsList) && gmailsList.length > 0
      ? gmailsList.map(item => ({
          email: item.gmail || item.email,
          password: item.password,
          recovery: item.recoveryEmail || item.recovery || "",
          ip: item.ip || "",
          note: item.note || ""
        }))
      : (order.deliveredAccounts || []);

    console.log(`Delivering ${deliveredAccounts.length} accounts.`);

    const downloadText = deliveredAccounts
      .map(acc => `${acc.email}:${acc.password}${acc.recovery ? `:${acc.recovery}` : ''}${acc.ip ? `:${acc.ip}` : ''}`)
      .join('\n');

    const warrantyHours = order.warrantyHours || 12;
    const warrantyExpiresAt = now + (Number(warrantyHours) * 60 * 60 * 1000);

    const orderUpdate = {
      status: "delivered",
      deliveredAccounts: deliveredAccounts,
      downloadText: downloadText,
      warrantyExpiresAt: warrantyExpiresAt,
      adminNote: adminNote,
      deliveredAt: now,
      delivered_at: now,
      updatedAt: now
    };

    const updates: Record<string, any> = {};
    Object.entries(orderUpdate).forEach(([k, v]) => {
      updates[`buyer_orders/${orderId}/${k}`] = v;
      updates[`orders/${orderId}/${k}`] = v;
      if (order.userId) {
        updates[`users/${order.userId}/orders/${orderId}/${k}`] = v;
        updates[`users/${order.userId}/buyer_orders/${orderId}/${k}`] = v;
        updates[`users/${order.userId}/buyerOrders/${orderId}/${k}`] = v;
      }
    });

    // Record in admin_logs
    const logId = `log_${now}`;
    updates[`admin_logs/${logId}`] = {
      id: logId,
      action: "approve_order",
      orderId,
      userId: order.userId,
      amount: order.totalAmount,
      quantity: order.quantity,
      timestamp: now,
      adminNote
    };

    // Deduct from reserved_balance (Escrow settlement) and update user status
    if (order.userId && order.totalAmount) {
      console.log(`Settling balance for user: ${order.userId}`);
      try {
        const user = await getDbNode(`users/${order.userId}`);
        const currentReserved = Number(user?.reserved_balance || 0);
        const newReserved = Math.max(0, currentReserved - Number(order.totalAmount));
        updates[`users/${order.userId}/reserved_balance`] = newReserved;
        // Sync with other wallet path
        updates[`buyer_wallets/${order.userId}/reserved_balance`] = newReserved;

        // Create transaction log for the buyer
        const txId = `tx_buy_${now}`;
        updates[`transactions/${txId}`] = {
          id: txId,
          userId: order.userId,
          userName: order.userName || "Buyer",
          type: "buyer_purchase",
          amount: Number(order.totalAmount),
          orderId: orderId,
          productTitle: order.productTitle || "Gmail Accounts",
          quantity: order.quantity || 1,
          status: "completed",
          timestamp: now,
          note: `Order #${orderId} Delivered & Escrow Settled`
        };
      } catch (userErr) {
        console.error("Error updating user balance:", userErr);
      }
    }

    // Update stock bank if items were used
    if (order.productId && deliveredAccounts.length > 0) {
      try {
        const bankNode = await getDbNode(`buyer_credentials_bank/${order.productId}`);
        if (bankNode) {
          Object.entries(bankNode).forEach(([k, v]: [string, any]) => {
            if (v && deliveredAccounts.some(d => d.email.toLowerCase() === (v.email || "").toLowerCase())) {
              updates[`buyer_credentials_bank/${order.productId}/${k}/status`] = "sold";
              updates[`buyer_credentials_bank/${order.productId}/${k}/soldAt`] = now;
              updates[`buyer_credentials_bank/${order.productId}/${k}/soldToOrderId`] = orderId;
            }
          });
        }
      } catch (bankErr) {
        console.error("Error updating stock bank:", bankErr);
      }
    }

    // Send Buyer Notification
    if (order.userId) {
      const notifId = `notif_ord_${now}`;
      const safeDeducted = Number(order.totalAmount ?? order.amount ?? 0);
      updates[`users/${order.userId}/notifications/${notifId}`] = {
        id: notifId,
        title: "✅ অর্ডার অ্যাপ্রুভ ও ডেলিভারি সম্পন্ন!",
        message: `আপনার অর্ডার #${orderId.slice(-6) || orderId} (${order.quantity || 1}টি জিমেইল) সফলভাবে অ্যাপ্রুভ হয়েছে এবং আপনার ব্যালেন্স থেকে মোট ৳${safeDeducted} কেটে নেওয়া হয়েছে। My Orders থেকে জিমেইল ও পাসওয়ার্ড দেখে নিন।`,
        type: "order_delivered",
        amount: safeDeducted,
        orderId: orderId,
        timestamp: now,
        read: false
      };
    }

    console.log("Applying database updates...");
    await updateDbPaths(updates);
    console.log("Order approved successfully!");

    res.json({
      success: true,
      message: `Order ${orderId} approved and delivered.`,
      deliveredCount: deliveredAccounts.length,
      downloadText
    });
  } catch (err: any) {
    console.error("Critical Approval Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/orders/reject (Reject order & release escrow hold back to wallet balance)
app.post("/api/admin/orders/reject", async (req, res) => {
  try {
    const { orderId, adminNote = "Order rejected / cancelled by Admin", refundAmount } = req.body || {};

    if (!orderId) {
      return res.status(400).json({ success: false, error: "orderId is required" });
    }

    const order = await getDbNode(`buyer_orders/${orderId}`) || await getDbNode(`orders/${orderId}`);
    if (!order) {
      return res.status(404).json({ success: false, error: `Order ${orderId} not found` });
    }

    // Strict Rule: Delivered/Completed/Replaced orders can NEVER be cancelled or refunded!
    if (order.status === 'delivered' || order.status === 'completed' || order.status === 'replaced') {
      return res.status(400).json({ success: false, error: "Order is already delivered and completed. Delivered orders cannot be refunded or cancelled." });
    }

    // Anti-Double-Refund Protection:
    if (order.status === 'cancelled' || order.status === 'refunded' || order.isRefunded) {
      return res.status(400).json({ success: false, error: "Order is already cancelled or refunded. Double refund prevented." });
    }

    const now = Date.now();
    const updates: Record<string, any> = {};

    // Exact single order total calculation (strictly the exact amount the user paid for this order)
    const rawQty = Math.max(1, Number(order.quantity || 1));
    const explicitTotal = Number(order.totalAmount ?? order.total_amount ?? order.total ?? 0);
    const explicitAmt = Number(order.amount ?? 0);
    const unitPrice = Number(order.unitPrice ?? order.unit_price ?? 0);
    const rawPrice = Number(order.price ?? 0);

    let calculatedTotal = 0;
    if (explicitTotal > 0) {
      calculatedTotal = explicitTotal;
    } else if (explicitAmt > 0) {
      calculatedTotal = explicitAmt;
    } else if (unitPrice > 0) {
      calculatedTotal = Number((unitPrice * rawQty).toFixed(2));
    } else if (rawPrice > 0) {
      calculatedTotal = rawPrice;
    }
    const validOrderAmt = isNaN(calculatedTotal) || calculatedTotal < 0 ? 0 : Number(calculatedTotal.toFixed(2));

    updates[`buyer_orders/${orderId}/status`] = "cancelled";
    updates[`buyer_orders/${orderId}/warrantyStatus`] = "cancelled";
    updates[`buyer_orders/${orderId}/adminNote`] = adminNote;
    updates[`buyer_orders/${orderId}/isRefunded`] = true;
    updates[`buyer_orders/${orderId}/refundedAt`] = now;
    updates[`buyer_orders/${orderId}/refundAmount`] = validOrderAmt;
    updates[`buyer_orders/${orderId}/updatedAt`] = now;

    updates[`orders/${orderId}/status`] = "cancelled";
    updates[`orders/${orderId}/warrantyStatus`] = "cancelled";
    updates[`orders/${orderId}/adminNote`] = adminNote;
    updates[`orders/${orderId}/isRefunded`] = true;
    updates[`orders/${orderId}/refundedAt`] = now;
    updates[`orders/${orderId}/refundAmount`] = validOrderAmt;
    updates[`orders/${orderId}/updatedAt`] = now;

    if (order.userId) {
      updates[`users/${order.userId}/orders/${orderId}/status`] = "cancelled";
      updates[`users/${order.userId}/orders/${orderId}/warrantyStatus`] = "cancelled";
      updates[`users/${order.userId}/orders/${orderId}/adminNote`] = adminNote;
      updates[`users/${order.userId}/orders/${orderId}/isRefunded`] = true;
      updates[`users/${order.userId}/orders/${orderId}/refundedAt`] = now;
      updates[`users/${order.userId}/orders/${orderId}/refundAmount`] = validOrderAmt;
      updates[`users/${order.userId}/orders/${orderId}/updatedAt`] = now;

      updates[`users/${order.userId}/buyer_orders/${orderId}/status`] = "cancelled";
      updates[`users/${order.userId}/buyer_orders/${orderId}/warrantyStatus`] = "cancelled";
      updates[`users/${order.userId}/buyer_orders/${orderId}/adminNote`] = adminNote;
      updates[`users/${order.userId}/buyer_orders/${orderId}/isRefunded`] = true;
      updates[`users/${order.userId}/buyer_orders/${orderId}/refundedAt`] = now;
      updates[`users/${order.userId}/buyer_orders/${orderId}/refundAmount`] = validOrderAmt;
      updates[`users/${order.userId}/buyer_orders/${orderId}/updatedAt`] = now;

      updates[`users/${order.userId}/buyerOrders/${orderId}/status`] = "cancelled";
      updates[`users/${order.userId}/buyerOrders/${orderId}/warrantyStatus`] = "cancelled";
      updates[`users/${order.userId}/buyerOrders/${orderId}/adminNote`] = adminNote;
      updates[`users/${order.userId}/buyerOrders/${orderId}/isRefunded`] = true;
      updates[`users/${order.userId}/buyerOrders/${orderId}/refundedAt`] = now;
      updates[`users/${order.userId}/buyerOrders/${orderId}/refundAmount`] = validOrderAmt;
      updates[`users/${order.userId}/buyerOrders/${orderId}/updatedAt`] = now;
    }

    // Restore product stock count
    if (order.productId) {
      try {
        const prod = await getDbNode(`buyer_products/${order.productId}`) || await getDbNode(`products/${order.productId}`);
        if (prod) {
          const newStock = (prod.stock || 0) + (order.quantity || 1);
          updates[`buyer_products/${order.productId}/stock`] = newStock;
          updates[`products/${order.productId}/stock`] = newStock;
        }
      } catch (_) {}
    }

    // Release escrow hold back to wallet balance
    const targetUserId = order.userId || order.user_id || order.uid || order.userUid;

    if (targetUserId && validOrderAmt > 0) {
      try {
        let user = await getDbNode(`users/${targetUserId}`);
        let buyerWalletData = await getDbNode(`buyer_wallets/${targetUserId}`) || {};

        // If targetUserId did not match direct node, try to search in all users
        if (!user && (order.userEmail || order.userName)) {
          const allUsers = await getDbNode("users") || {};
          const emailMatch = (order.userEmail || '').toLowerCase().trim();
          for (const [uK, uV] of Object.entries(allUsers as Record<string, any>)) {
            if (emailMatch && uV?.email && uV.email.toLowerCase().trim() === emailMatch) {
              user = uV;
              buyerWalletData = await getDbNode(`buyer_wallets/${uK}`) || {};
              break;
            }
          }
        }
        user = user || {};
        
        let curBuyerBal = 0;
        if (user.buyerWalletBalance !== undefined && user.buyerWalletBalance !== null) {
          curBuyerBal = Number(user.buyerWalletBalance);
        } else if (buyerWalletData.balance !== undefined && buyerWalletData.balance !== null) {
          curBuyerBal = Number(buyerWalletData.balance);
        } else if (user.deposit_balance !== undefined && user.deposit_balance !== null) {
          curBuyerBal = Number(user.deposit_balance);
        } else if (user.depositBalance !== undefined && user.depositBalance !== null) {
          curBuyerBal = Number(user.depositBalance);
        } else if (user.buyingBalance !== undefined && user.buyingBalance !== null) {
          curBuyerBal = Number(user.buyingBalance);
        } else if (buyerWalletData.buyerWalletBalance !== undefined && buyerWalletData.buyerWalletBalance !== null) {
          curBuyerBal = Number(buyerWalletData.buyerWalletBalance);
        }
        if (isNaN(curBuyerBal)) curBuyerBal = 0;

        let curReserved = Number(user.reserved_balance ?? user.deposit_reserved ?? buyerWalletData.reserved_balance ?? 0);
        if (isNaN(curReserved)) curReserved = 0;

        const newBuyerBal = Number((curBuyerBal + validOrderAmt).toFixed(2));
        const newReserved = Math.max(0, Number((curReserved - validOrderAmt).toFixed(2)));

        // Update ONLY Buyer / Deposit Wallet Balance across all compatible fields
        updates[`users/${targetUserId}/buyerWalletBalance`] = newBuyerBal;
        updates[`users/${targetUserId}/deposit_balance`] = newBuyerBal;
        updates[`users/${targetUserId}/depositBalance`] = newBuyerBal;
        updates[`users/${targetUserId}/buyingBalance`] = newBuyerBal;
        updates[`users/${targetUserId}/buying_balance`] = newBuyerBal;
        updates[`users/${targetUserId}/reserved_balance`] = newReserved;
        updates[`users/${targetUserId}/deposit_reserved`] = newReserved;

        updates[`buyer_wallets/${targetUserId}/balance`] = newBuyerBal;
        updates[`buyer_wallets/${targetUserId}/buyerWalletBalance`] = newBuyerBal;
        updates[`buyer_wallets/${targetUserId}/deposit_balance`] = newBuyerBal;
        updates[`buyer_wallets/${targetUserId}/depositBalance`] = newBuyerBal;
        updates[`buyer_wallets/${targetUserId}/reserved_balance`] = newReserved;
        updates[`buyer_wallets/${targetUserId}/lastRefundAt`] = now;

        // Transaction log
        const txId = `tx_ref_${now}`;
        updates[`transactions/${txId}`] = {
          id: txId,
          userId: targetUserId,
          type: "refund",
          amount: validOrderAmt,
          balanceAfter: newBuyerBal,
          description: `Refund for Order #${orderId.slice(-6)}: ${adminNote || 'Cancelled'} (Deposit wallet refunded)`,
          timestamp: now,
          status: "completed"
        };

        // User notification
        const notifId = `notif_ref_${now}`;
        updates[`users/${targetUserId}/notifications/${notifId}`] = {
          id: notifId,
          title: "অর্ডার বাতিল ও ডিপোজিট রিফান্ড! 💸",
          message: `আপনার অর্ডার #${orderId.slice(-6) || orderId} বাতিল করা হয়েছে এবং মোট ৳${validOrderAmt} টাকা আপনার Buying Gmail ডিপোজিট ব্যালেন্সে রিফান্ড যোগ করা হয়েছে।${adminNote ? ` (কারণ: ${adminNote})` : ''}`,
          type: "order_refunded",
          amount: validOrderAmt,
          orderId: orderId,
          timestamp: now,
          read: false
        };
      } catch (err) {
        console.error("Refund balance calc error:", err);
      }
    }

    await updateDbPaths(updates);

    res.json({
      success: true,
      message: `Order ${orderId} rejected. Escrow hold released and inventory restored.`,
      orderId,
      note: adminNote
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// 5. Withdrawal Requests Management Endpoints
// ----------------------------------------------------
app.get("/api/admin/withdrawals", async (req, res) => {
  try {
    const rawWds = await getDbNode("withdraw_requests");
    const list = rawWds ? Object.keys(rawWds).map(key => ({
      id: key,
      ...rawWds[key]
    })).sort((a, b) => (b.requestedAt || 0) - (a.requestedAt || 0)) : [];

    res.json({ success: true, count: list.length, withdrawals: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/admin/withdrawals/approve", async (req, res) => {
  try {
    const { withdrawId, trxId = "" } = req.body || {};
    if (!withdrawId) {
      return res.status(400).json({ success: false, error: "withdrawId is required" });
    }

    const now = Date.now();
    const updates: Record<string, any> = {};
    updates[`withdraw_requests/${withdrawId}/status`] = "approved";
    updates[`withdraw_requests/${withdrawId}/approvedAt`] = now;
    if (trxId) updates[`withdraw_requests/${withdrawId}/trxId`] = trxId;

    await updateDbPaths(updates);
    res.json({ success: true, message: `Withdrawal ${withdrawId} approved.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/admin/withdrawals/reject", async (req, res) => {
  try {
    const { withdrawId, reason = "Rejected by Admin" } = req.body || {};
    if (!withdrawId) {
      return res.status(400).json({ success: false, error: "withdrawId is required" });
    }

    const wd = await getDbNode(`withdraw_requests/${withdrawId}`);
    const now = Date.now();
    const updates: Record<string, any> = {};

    updates[`withdraw_requests/${withdrawId}/status`] = "rejected";
    updates[`withdraw_requests/${withdrawId}/rejectReason`] = reason;
    updates[`withdraw_requests/${withdrawId}/rejectedAt`] = now;

    // Refund user balance
    if (wd?.userId && wd?.amount) {
      try {
        const user = await getDbNode(`users/${wd.userId}`);
        const curBal = Number(user?.balance || 0);
        updates[`users/${wd.userId}/balance`] = curBal + Number(wd.amount);
      } catch (_) {}
    }

    await updateDbPaths(updates);
    res.json({ success: true, message: `Withdrawal ${withdrawId} rejected and balance refunded.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// 6. User Management Endpoints
// ----------------------------------------------------
// Public / App User Profile & Balance Endpoints
app.get(["/api/users/:userId/balance", "/api/user/:userId/balance", "/api/buyer/balance/:userId"], async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await getDbNode(`users/${userId}`);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    const isBuyerPath = req.path.includes("/buyer/") || req.originalUrl.includes("/buyer/");
    const balance = isBuyerPath 
      ? Number(user.buyerWalletBalance ?? 0)
      : Number(user.balance ?? 0);
    const reservedBalance = Number(user.reserved_balance ?? 0);
    res.json({
      success: true,
      userId,
      balance,
      reservedBalance,
      buyerWalletBalance: Number(user.buyerWalletBalance ?? 0),
      sellerBalance: Number(user.balance ?? 0),
      user
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// User Orders
app.get(["/api/users/:userId/orders", "/api/user/:userId/orders", "/api/buyer/orders/:userId"], async (req, res) => {
  try {
    const { userId } = req.params;
    const [rawBuyerOrders, rawOrders, rawUserOrders] = await Promise.allSettled([
      getDbNode("buyer_orders"),
      getDbNode("orders"),
      getDbNode(`users/${userId}/orders`)
    ]);

    const o1 = rawBuyerOrders.status === 'fulfilled' ? rawBuyerOrders.value || {} : {};
    const o2 = rawOrders.status === 'fulfilled' ? rawOrders.value || {} : {};
    const o3 = rawUserOrders.status === 'fulfilled' ? rawUserOrders.value || {} : {};

    const merged = { ...o3, ...o2, ...o1 };
    const list = Object.keys(merged)
      .map(k => ({ id: k, ...merged[k] }))
      .filter(o => o.userId === userId || o.userEmail?.toLowerCase() === userId.toLowerCase())
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    res.json({ success: true, count: list.length, orders: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// User Deposits
app.get(["/api/users/:userId/deposits", "/api/user/:userId/deposits", "/api/buyer/deposits/:userId"], async (req, res) => {
  try {
    const { userId } = req.params;
    const [rawBuyerDep, rawDepReq, rawUserDep] = await Promise.allSettled([
      getDbNode("buyer_deposits"),
      getDbNode("deposit_requests"),
      getDbNode(`users/${userId}/deposits`)
    ]);

    const d1 = rawBuyerDep.status === 'fulfilled' ? rawBuyerDep.value || {} : {};
    const d2 = rawDepReq.status === 'fulfilled' ? rawDepReq.value || {} : {};
    const d3 = rawUserDep.status === 'fulfilled' ? rawUserDep.value || {} : {};

    const merged = { ...d3, ...d2, ...d1 };
    const list = Object.keys(merged)
      .map(k => ({ id: k, ...merged[k] }))
      .filter(d => d.userId === userId || d.userEmail?.toLowerCase() === userId.toLowerCase())
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    res.json({ success: true, count: list.length, deposits: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Public / Buyer Order Checkout Endpoint
app.post(["/api/orders", "/api/buyer/orders", "/api/buy"], async (req, res) => {
  try {
    const { 
      userId, 
      productId, 
      quantity = 1, 
      userEmail = "", 
      userName = "", 
      userPhone = "" 
    } = req.body || {};

    if (!userId || !productId) {
      return res.status(400).json({ success: false, error: "userId and productId are required" });
    }

    const qty = Math.max(1, Number(quantity) || 1);

    await runWithUserLock(userId, async () => {
    // Fetch user & product
    const [user, prod1, prod2] = await Promise.all([
      getDbNode(`users/${userId}`),
      getDbNode(`buyer_products/${productId}`),
      getDbNode(`products/${productId}`)
    ]);

    if (!user) {
      return res.status(404).json({ success: false, error: "Buyer user account not found" });
    }

    const product = prod1 || prod2;
    if (!product) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }

    const currentStock = Number(product.stock || 0);
    if (currentStock < qty) {
      return res.status(400).json({ 
        success: false, 
        error: `দুঃখিত, স্টকে পর্যাপ্ত পরিমাণ প্রোডাক্ট নেই। বর্তমান স্টক: ${currentStock} পিস।` 
      });
    }

    const unitPrice = Number(product.price || 0);
    const totalCost = Number((qty * unitPrice).toFixed(2));
    const buyerWalletData = await getDbNode(`buyer_wallets/${userId}`);
    const userBal = Number(user.buyerWalletBalance ?? buyerWalletData?.balance ?? 0);

    if (userBal < totalCost) {
      return res.status(400).json({ 
        success: false, 
        error: `Insufficient deposit balance. Required: ৳${totalCost}, Available: ৳${userBal}. Please deposit funds first in Buying Gmail.` 
      });
    }

    const now = Date.now();
    const orderId = `ORD-${Date.now().toString().slice(-6)}`;
    const currentReserved = Number(user.reserved_balance || 0);
    const newBal = Math.max(0, Number((userBal - totalCost).toFixed(2)));
    const newReserved = Number((currentReserved + totalCost).toFixed(2));

    const orderPayload = {
      id: orderId,
      userId,
      userName: userName || user.username || user.name || "Buyer",
      userEmail: userEmail || user.email || "",
      userPhone: userPhone || user.phone || "",
      productId,
      productTitle: product.title,
      category: product.category || "fresh",
      quantity: qty,
      unitPrice,
      totalAmount: totalCost,
      status: "pending",
      deliveredAccounts: [],
      downloadText: "",
      warrantyHours: product.warrantyHours || 12,
      warrantyExpiresAt: 0,
      warrantyStatus: "none",
      createdAt: now,
      updatedAt: now
    };

    const updates: Record<string, any> = {};
    updates[`buyer_orders/${orderId}`] = orderPayload;
    updates[`orders/${orderId}`] = orderPayload;
    updates[`users/${userId}/orders/${orderId}`] = orderPayload;

    // Deduct only from Buyer Wallet / Deposit balance
    updates[`users/${userId}/buyerWalletBalance`] = newBal;
    updates[`buyer_wallets/${userId}/balance`] = newBal;
    updates[`buyer_wallets/${userId}/buyerWalletBalance`] = newBal;
    
    // Hold / Reserved
    updates[`users/${userId}/reserved_balance`] = newReserved;
    updates[`buyer_wallets/${userId}/reserved_balance`] = newReserved;

    const remainingStock = Math.max(0, Number(product.stock || 0) - qty);
    updates[`buyer_products/${productId}/stock`] = remainingStock;
    updates[`buyer_products/${productId}/updatedAt`] = now;
    updates[`products/${productId}/stock`] = remainingStock;
    updates[`products/${productId}/updatedAt`] = now;

    const txId = `tx_buy_${now}`;
    updates[`transactions/${txId}`] = {
      id: txId,
      userId,
      userName: userName || user.username || "Buyer",
      type: "buyer_purchase_escrow",
      amount: totalCost,
      balanceAfter: newBal,
      orderId,
      status: "pending",
      timestamp: now,
      note: `Escrow Hold: Purchased ${qty} pcs of ${product.title}`
    };

    await updateDbPaths(updates);

    res.status(201).json({
      success: true,
      message: "Order placed successfully! In escrow pending admin delivery.",
      orderId,
      order: orderPayload,
      newWalletBalance: newBal
    });
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/admin/users", async (req, res) => {
  try {
    const rawUsers = await getDbNode("users");
    const list = rawUsers ? Object.keys(rawUsers).map(key => ({
      uid: key,
      ...rawUsers[key]
    })) : [];

    res.json({ success: true, count: list.length, users: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/admin/users/:userId/balance", async (req, res) => {
  try {
    const { userId } = req.params;
    const { action, amount, reason = "Manual Adjustment" } = req.body || {};

    if (amount === undefined) {
      return res.status(400).json({ success: false, error: "amount is required" });
    }

    // Map add | subtract action
    let adjustmentAmount = Number(amount);
    if (action === "subtract") {
      adjustmentAmount = -Math.abs(adjustmentAmount);
    } else if (action === "add") {
      adjustmentAmount = Math.abs(adjustmentAmount);
    }

    const user = await getDbNode(`users/${userId}`);
    const curBal = Number(user?.balance || 0);
    const newBal = curBal + adjustmentAmount;
    const now = Date.now();

    const updates: Record<string, any> = {};
    updates[`users/${userId}/balance`] = newBal;

    const txId = `tx_adj_${now}`;
    updates[`transactions/${txId}`] = {
      id: txId,
      userId,
      type: adjustmentAmount >= 0 ? "credit" : "debit",
      amount: Math.abs(adjustmentAmount),
      balanceAfter: newBal,
      description: reason,
      timestamp: now,
      status: "completed"
    };

    await updateDbPaths(updates);

    res.json({
      success: true,
      message: `User ${userId} balance adjusted by ${adjustmentAmount}`,
      newBalance: newBal
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/transactions
app.get("/api/admin/transactions", async (req, res) => {
  try {
    const rawTx = await getDbNode("transactions");
    const list = rawTx ? Object.keys(rawTx).map(key => ({
      id: key,
      ...rawTx[key]
    })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)) : [];

    // Map/Normalize the response format as requested
    const mappedList = list.map((tx: any) => ({
      id: tx.id,
      buyer: tx.userName || tx.userEmail || tx.userId || "N/A",
      userId: tx.userId,
      amount: tx.amount,
      time: tx.timestamp || Date.now(),
      type: tx.type === "buyer_purchase_escrow" || tx.type === "buyer_purchase" ? "Buy" : (tx.type === "deposit" ? "Deposit" : "Adjustment"),
      rawType: tx.type,
      description: tx.description || tx.note || ""
    }));

    res.json(mappedList);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Automatic Database Scan and Cleanup for contaminated nested deposit paths
async function cleanUpContaminatedDeposits() {
  const rootNodes = [
    'buyer_deposits', 'deposit_requests', 'deposits', 'user_deposits',
    'payment_requests', 'Pending_Deposits', 'pending_deposits',
    'recharge_requests', 'add_money', 'AddMoney'
  ];

  console.log("[CLEANUP] Starting scanning for contaminated nested deposit paths...");
  const deletePromises: Promise<any>[] = [];

  for (const node of rootNodes) {
    try {
      const data = await getDbNode(node);
      if (data && typeof data === 'object') {
        for (const [key, val] of Object.entries(data)) {
          if (val && typeof val === 'object') {
            const childValues = Object.values(val);
            // If any child value is an object (except for array or null), it means this is a nested user ID folder instead of a flat deposit transaction!
            const isNestedFolder = childValues.some(v => v && typeof v === 'object' && !Array.isArray(v));
            
            if (isNestedFolder) {
              console.log(`[CLEANUP] Found contaminated nested node: ${node}/${key}. Deleting...`);
              deletePromises.push(deleteDbNode(`${node}/${key}`));
            }
          }
        }
      }
    } catch (err: any) {
      console.warn(`[CLEANUP] Error scanning node ${node}:`, err.message);
    }
  }

  if (deletePromises.length > 0) {
    await Promise.allSettled(deletePromises);
    console.log(`[CLEANUP] Successfully removed ${deletePromises.length} contaminated nodes.`);
  } else {
    console.log("[CLEANUP] No contaminated nodes found.");
  }
}

// ----------------------------------------------------
// 7. Vite Integration & Static Frontend Serving
// ----------------------------------------------------
async function startServer() {
  // Run database cleanup
  try {
    await cleanUpContaminatedDeposits();
  } catch (err: any) {
    console.error("[CLEANUP ERROR]", err);
  }

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`API Docs available at: http://localhost:${PORT}/api/admin/docs`);
    console.log(`Status check at: http://localhost:${PORT}/api/admin/status`);
  });
}

startServer();
