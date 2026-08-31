export interface DeliveredAccount {
  email: string;
  password: string;
}

/**
 * Robustly extracts an array of DeliveredAccount objects from any order payload.
 * Handles Array, Firebase Object Map, and string formats (downloadText, adminNote, gmails, etc.).
 */
export const extractDeliveredAccounts = (order: any): DeliveredAccount[] => {
  if (!order || typeof order !== 'object') return [];

  // 1. Try multiple source fields
  const rawAccounts = order.deliveredAccounts || order.delivered_accounts || order.accounts || order.gmails || order.delivered_data || order.deliveredData;

  // Case 1A: It's a single account object { email: '...', password: '...' }
  if (rawAccounts && typeof rawAccounts === 'object' && !Array.isArray(rawAccounts)) {
    const singleEmail = rawAccounts.email || rawAccounts.gmail || rawAccounts.user || rawAccounts.username || rawAccounts.Account || rawAccounts.Email;
    if (singleEmail) {
      return [{
        email: String(singleEmail).trim(),
        password: String(rawAccounts.password || rawAccounts.pass || rawAccounts.Password || rawAccounts.Pass || 'N/A').trim()
      }];
    }
  }

  // Case 1B: It's an Array
  if (Array.isArray(rawAccounts) && rawAccounts.length > 0) {
    const mapped = rawAccounts
      .map((a: any) => {
        if (!a) return null;
        if (typeof a === 'string') {
          const parts = a.split(/[:|,\t\s]+/).map(p => p.trim()).filter(Boolean);
          if (parts[0] && (parts[0].includes('@') || parts.length >= 2)) {
            return {
              email: parts[0],
              password: parts[1] || 'N/A'
            };
          }
          return null;
        }
        const email = a.email || a.gmail || a.user || a.username || a.Account || a.Email || '';
        if (email) {
          return {
            email: String(email).trim(),
            password: String(a.password || a.pass || a.Password || a.Pass || 'N/A').trim()
          };
        }
        return null;
      })
      .filter(Boolean) as DeliveredAccount[];

    if (mapped.length > 0) return mapped;
  }

  // Case 1C: It's a Firebase Object Map of accounts { '0': { email, password }, '1': { ... } }
  if (rawAccounts && typeof rawAccounts === 'object' && !Array.isArray(rawAccounts)) {
    const vals = Object.values(rawAccounts).filter(Boolean);
    if (vals.length > 0) {
      const mapped = vals
        .map((a: any) => {
          if (!a) return null;
          if (typeof a === 'string') {
            const parts = a.split(/[:|,\t\s]+/).map(p => p.trim()).filter(Boolean);
            if (parts[0] && (parts[0].includes('@') || parts.length >= 2)) {
              return {
                email: parts[0],
                password: parts[1] || 'N/A'
              };
            }
            return null;
          }
          const email = a.email || a.gmail || a.user || a.username || a.Account || a.Email || '';
          if (email) {
            return {
              email: String(email).trim(),
              password: String(a.password || a.pass || a.Password || a.Pass || 'N/A').trim()
            };
          }
          return null;
        })
        .filter(Boolean) as DeliveredAccount[];

      if (mapped.length > 0) return mapped;
    }
  }

  // 2. Parse text string sources: downloadText, adminNote, etc.
  const textSources = [
    order.downloadText,
    order.download_text,
    order.deliveredText,
    order.delivered_text,
    order.deliveredData,
    order.delivered_data,
    order.adminNote,
    order.admin_note,
    order.notes
  ];

  for (const src of textSources) {
    if (typeof src === 'string' && src.trim()) {
      const lines = src.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const parsed: DeliveredAccount[] = [];

      for (const line of lines) {
        if (line.startsWith('http') || line.includes('অর্ডার') || line.includes('রিফান্ড') || line.includes('ডেলিভারি')) {
          continue;
        }
        const parts = line.split(/[:|,\t\s]+/).map(p => p.trim()).filter(Boolean);
        if (parts.length >= 2 || (parts.length === 1 && parts[0].includes('@'))) {
          parsed.push({
            email: parts[0],
            password: parts[1] || 'N/A'
          });
        }
      }

      if (parsed.length > 0) return parsed;
    }
  }

  return [];
};

/**
 * Formats delivered accounts array into a single downloadable .txt string (email:password:recovery:ip)
 */
export const extractDownloadText = (order: any, accountsOverride?: DeliveredAccount[]): string => {
  const accounts = accountsOverride || extractDeliveredAccounts(order);
  if (accounts.length > 0) {
    return accounts
      .map(a => `${a.email}:${a.password}`)
      .join('\n');
  }
  return String(order?.downloadText || order?.download_text || '').trim();
};

/**
 * Merges two order payloads cleanly without dropping deliveredAccounts or status
 */
export const mergeOrderObjects = (existing: any, incoming: any): any => {
  if (!existing) return incoming || {};
  if (!incoming) return existing || {};

  const merged = { ...existing, ...incoming };

  // Status priority: delivered/cancelled/warranty_claimed/replaced over pending/processing
  const priorityStatus = ['delivered', 'cancelled', 'refunded', 'warranty_claimed', 'claimed', 'replaced'];
  if (priorityStatus.includes(existing.status) && (!incoming.status || incoming.status === 'pending' || incoming.status === 'processing')) {
    merged.status = existing.status;
  }

  // Preserve deliveredAccounts
  const existingAccounts = extractDeliveredAccounts(existing);
  const incomingAccounts = extractDeliveredAccounts(incoming);

  if (incomingAccounts.length > 0) {
    merged.deliveredAccounts = incomingAccounts;
  } else if (existingAccounts.length > 0) {
    merged.deliveredAccounts = existingAccounts;
  } else {
    merged.deliveredAccounts = [];
  }

  // Preserve downloadText
  merged.downloadText = extractDownloadText(merged, merged.deliveredAccounts);

  // Preserve admin note
  merged.adminNote = incoming.adminNote || incoming.admin_note || existing.adminNote || existing.admin_note || '';

  // Standard fields
  merged.id = String(incoming.id || existing.id);
  merged.userId = incoming.userId || incoming.user_id || incoming.uid || existing.userId || existing.user_id || existing.uid || '';
  merged.userName = incoming.userName || incoming.user_name || incoming.username || existing.userName || existing.user_name || existing.username || 'Buyer';
  merged.productTitle = incoming.productTitle || incoming.product_title || incoming.title || existing.productTitle || existing.product_title || existing.title || 'Gmail Accounts';
  merged.totalAmount = Number(incoming.totalAmount ?? incoming.total_amount ?? incoming.amount ?? existing.totalAmount ?? existing.total_amount ?? existing.amount ?? 0);
  merged.quantity = Number(incoming.quantity ?? incoming.qty ?? existing.quantity ?? existing.qty ?? 1);
  merged.warrantyExpiresAt = Number(incoming.warrantyExpiresAt || incoming.warranty_expires_at || existing.warrantyExpiresAt || existing.warranty_expires_at || 0);

  return merged;
};
