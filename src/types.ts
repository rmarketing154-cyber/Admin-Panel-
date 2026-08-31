export interface BuyerProduct {
  id: string;
  title: string;
  banglaTitle?: string;
  category: 'fresh' | 'aged' | 'recovery' | 'usa' | 'bulk' | 'custom' | string;
  price: number; // in BDT
  stock: number; // manual stock or calculated from available credentials
  liveStock?: number;
  totalLoaded?: number;
  image?: string; // Base64 or Image URL
  imageUrl?: string;
  minOrder: number;
  maxOrder: number;
  description: string;
  warrantyHours: number;
  format?: string; // e.g. "email:password:recovery"
  active: boolean;
  badge?: string;
  color?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface BuyerCredential {
  id: string;
  productId: string;
  email: string;
  password: string;
  recovery?: string;
  ip?: string;
  note?: string;
  status: 'available' | 'sold' | 'reserved';
  soldToOrderId?: string;
  addedAt: number;
  soldAt?: number;
}

export interface BuyerDepositRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  paymentMethod: 'bkash' | 'nagad' | 'rocket' | 'usdt' | 'bank' | string;
  senderNumber: string;
  trxId: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectReason?: string;
  createdAt: number;
  approvedAt?: number;
  approvedBy?: string;
  rejectedAt?: number;
}

export interface BuyerOrder {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  productId: string;
  productTitle: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  status: 'pending' | 'delivered' | 'completed' | 'cancelled' | 'processing' | 'refunded' | 'warranty_claimed' | 'replaced';
  deliveredAccounts: Array<{
    email: string;
    password: string;
    recovery?: string;
    ip?: string;
    note?: string;
  }>;
  downloadText?: string;
  adminNote?: string;
  admin_note?: string;
  deliveredAt?: number;
  delivered_at?: number;
  approvedBy?: string;
  approved_by?: string;
  cancelledAt?: number;
  cancelled_at?: number;
  cancelledBy?: string;
  cancelled_by?: string;
  cancelReason?: string;
  rejectReason?: string;
  warrantyHours: number;
  warrantyExpiresAt: number;
  warrantyStatus?: 'none' | 'claimed' | 'resolved' | 'replaced' | 'refunded';
  warrantyClaimReason?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface DepositGateway {
  id: string;
  name: string;
  type: 'Personal' | 'Merchant' | 'Agent';
  number: string;
  color?: string;
  logo?: string;
  active: boolean;
  rate?: number; // For USDT conversion rate
  instructions?: string;
}
