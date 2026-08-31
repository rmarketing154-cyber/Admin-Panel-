import React, { useState, useMemo } from 'react';
import { ref, set, update, remove, push, get } from 'firebase/database';
import { db } from '../../lib/firebase';
import { BuyerProduct, BuyerCredential } from '../../types';
import Swal from 'sweetalert2';
import { 
  Package, 
  Plus, 
  Edit3, 
  Trash2, 
  Upload, 
  Database, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Download, 
  Copy, 
  Layers, 
  Clock, 
  Sparkles, 
  ShieldCheck, 
  AlertCircle,
  FileText,
  RefreshCw,
  Eye,
  Lock,
  Tag
} from 'lucide-react';
import { copyToClipboardFallback } from '../../lib/clipboard';

const DEFAULT_STARTER_PRODUCTS: Omit<BuyerProduct, 'id'>[] = [
  {
    title: 'Aged / Old Gmail Accounts (2020-2023)',
    banglaTitle: 'ওল্ড জিমেইল অ্যাকাউন্ট (২০২০-২০২৩)',
    category: 'aged',
    price: 55,
    stock: 0,
    minOrder: 5,
    maxOrder: 500,
    description: '100% Phone Verified (PVA), attached recovery email, aged trust score. Best for CPA, Google Ads, Play Store & high-trust work.',
    warrantyHours: 12,
    format: 'email:password:recovery',
    active: true,
    badge: 'High Demand',
    color: 'from-amber-500 to-orange-600',
    createdAt: Date.now()
  },
  {
    title: 'Fresh Quality Gmail Accounts',
    banglaTitle: 'ফ্রেশ জিমেইল (নন-ড্রপ গ্যারান্টি)',
    category: 'fresh',
    price: 12,
    stock: 0,
    minOrder: 10,
    maxOrder: 1000,
    description: '24-72 hours fresh, human realistic names, multi-IP created, instant inbox access. Ideal for bulk mailing & outreach.',
    warrantyHours: 12,
    format: 'email:password:recovery',
    active: true,
    badge: 'Best Seller',
    color: 'from-emerald-500 to-teal-600',
    createdAt: Date.now()
  },
  {
    title: 'USA / UK Geo-Targeted Gmails',
    banglaTitle: 'ইউএসএ / ইউকে আইপি জিমেইল',
    category: 'usa',
    price: 95,
    stock: 0,
    minOrder: 3,
    maxOrder: 200,
    description: 'Residential US/UK IP created, phone verified, 2FA backup codes included, zero security prompt on login.',
    warrantyHours: 12,
    format: 'email:password:recovery:ip',
    active: true,
    badge: 'Premium Tier',
    color: 'from-indigo-500 to-purple-600',
    createdAt: Date.now()
  }
];

export default function BuyerProductsManager({ data, adminEmail }: { data: any; adminEmail?: string }) {
  const products: BuyerProduct[] = data.buyerProducts || [];
  const credentialsBank = data.buyerCredentialsBank || {};

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProductForBank, setSelectedProductForBank] = useState<BuyerProduct | null>(null);
  const [bankTab, setBankTab] = useState<'available' | 'sold' | 'all'>('available');
  const [bankSearch, setBankSearch] = useState('');

  // Calculate live stock from credentials bank for each product
  const enrichedProducts = useMemo(() => {
    return products.map(p => {
      const pBank = credentialsBank[p.id] || {};
      const creds: BuyerCredential[] = Object.keys(pBank).map(k => ({ id: k, ...pBank[k] }));
      const availableCount = creds.filter(c => c.status === 'available' || !c.status).length;
      const manualStock = Number(p.stock) || 0;
      const liveStockCount = availableCount > 0 ? availableCount : manualStock;
      return {
        ...p,
        liveStock: liveStockCount,
        totalLoaded: creds.length
      };
    });
  }, [products, credentialsBank]);

  const filteredProducts = useMemo(() => {
    return enrichedProducts.filter(p => {
      if (!p) return false;
      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const titleMatch = (p.title || '').toLowerCase().includes(q);
        const banglaTitleMatch = (p.banglaTitle || '').toLowerCase().includes(q);
        const categoryMatch = (p.category || '').toLowerCase().includes(q);
        return titleMatch || banglaTitleMatch || categoryMatch;
      }
      return true;
    });
  }, [enrichedProducts, selectedCategory, search]);

  // Seed starter products if empty
  const handleSeedStarters = async () => {
    try {
      Swal.fire({
        title: 'ডিফল্ট প্রোডাক্ট যোগ করবেন?',
        text: '৩টি জনপ্রিয় ক্যাটাগরির প্রোডাক্ট লিস্ট তৈরি করা হবে (Aged, Fresh, USA IP)।',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'হ্যাঁ, তৈরি করুন',
        cancelButtonText: 'না',
        confirmButtonColor: '#4f46e5'
      }).then(async (res) => {
        if (res.isConfirmed) {
          for (const item of DEFAULT_STARTER_PRODUCTS) {
            const newRef = push(ref(db, 'buyer_products'));
            await set(newRef, item);
            try {
              await set(ref(db, `products/${newRef.key}`), item);
            } catch (_) {}
          }
          Swal.fire('সফল!', 'ডিফল্ট প্রোডাক্ট লিস্ট তৈরি করা হয়েছে।', 'success');
        }
      });
    } catch (e: any) {
      console.error(e);
      Swal.fire('Error', e.message || 'Failed to seed products', 'error');
    }
  };

  // Add or Edit Product Modal
  const handleOpenProductModal = (product?: BuyerProduct) => {
    const isEdit = !!product;
    const initialImg = product?.image || product?.imageUrl || '';
    let selectedImageBase64 = initialImg;

    Swal.fire({
      title: isEdit ? 'প্রোডাক্ট এডিট করুন (Edit Product)' : 'নতুন প্রোডাক্ট পোস্ট করুন (Add Product)',
      width: '640px',
      html: `
        <div class="text-left space-y-3.5 text-xs">
          <!-- Product Name -->
          <div>
            <label class="font-black text-slate-800 block mb-1">Product Name: *</label>
            <input id="swal-title" class="swal2-input !m-0 !w-full !text-sm !font-bold" placeholder="e.g. Fresh Gmail PVA Accounts" value="${product?.title || ''}">
          </div>

          <!-- Bangla Title (Optional) -->
          <div>
            <label class="font-bold text-slate-600 block mb-1">বাংলা নাম (Bangla Title - ঐচ্ছিক):</label>
            <input id="swal-btitle" class="swal2-input !m-0 !w-full !text-sm" placeholder="যেমন: ফ্রেশ জিমেইল (নন-ড্রপ গ্যারান্টি)" value="${product?.banglaTitle || ''}">
          </div>

          <!-- Price & Stock -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="font-black text-slate-800 block mb-1">Price: (প্রতি পিস টাকা) *</label>
              <input id="swal-price" type="number" step="0.5" min="0" class="swal2-input !m-0 !w-full !text-sm font-black text-indigo-700" placeholder="e.g. 15" value="${product?.price ?? 15}">
            </div>
            <div>
              <label class="font-black text-slate-800 block mb-1">Stock: (স্টক সংখ্যা লিখে দিন) *</label>
              <input id="swal-stock" type="number" min="0" class="swal2-input !m-0 !w-full !text-sm font-black text-emerald-700" placeholder="e.g. 100" value="${product?.stock ?? (product?.liveStock ?? 50)}">
            </div>
          </div>

          <!-- Category & Status -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="font-black text-slate-800 block mb-1">Category: *</label>
              <select id="swal-category" class="swal2-select !m-0 !w-full !text-sm font-bold">
                <option value="fresh" ${product?.category === 'fresh' || !product ? 'selected' : ''}>Fresh Quality (ফ্রেশ জিমেইল)</option>
                <option value="aged" ${product?.category === 'aged' ? 'selected' : ''}>Aged / Old (পুরাতন জিমেইল)</option>
                <option value="recovery" ${product?.category === 'recovery' ? 'selected' : ''}>Recovery PVA (রিকভারি ইমেইল যুক্ত)</option>
                <option value="usa" ${product?.category === 'usa' ? 'selected' : ''}>USA / UK IP (ইউএসএ/ইউকে আইপি)</option>
                <option value="bulk" ${product?.category === 'bulk' ? 'selected' : ''}>Bulk Discount (পাইকারি প্যাকেজ)</option>
                <option value="custom" ${product?.category === 'custom' ? 'selected' : ''}>Custom Special (কাস্টম স্পেশাল)</option>
              </select>
            </div>

            <div>
              <label class="font-black text-slate-800 block mb-1">Status: *</label>
              <div class="flex items-center gap-2 h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl mt-0.5">
                <input type="checkbox" id="swal-active" class="w-4 h-4 text-emerald-600 rounded cursor-pointer" ${product?.active !== false ? 'checked' : ''}>
                <label for="swal-active" class="font-black text-slate-800 cursor-pointer text-xs flex items-center gap-1">
                  <span>Active [✓]</span>
                  <span class="text-[10px] text-slate-500 font-normal">(মার্কেটপ্লেসে দৃশ্যমান থাকবে)</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Image Upload: Choose File & URL & Preview -->
          <div class="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
            <label class="font-black text-slate-800 block">Image: [Choose File / ছবি নির্বাচন করুন]</label>
            
            <div class="flex items-center gap-3">
              <!-- Thumbnail Preview Box -->
              <div class="w-20 h-20 rounded-xl bg-white border-2 border-dashed border-slate-300 overflow-hidden flex items-center justify-center shrink-0 shadow-inner relative">
                <img id="swal-img-preview" src="${initialImg}" alt="Preview" class="${initialImg ? '' : 'hidden'} w-full h-full object-cover">
                <div id="swal-img-placeholder" class="${initialImg ? 'hidden' : 'flex'} flex-col items-center justify-center text-slate-400 text-[10px]">
                  <span class="text-base">🖼️</span>
                  <span>নো ইমেজ</span>
                </div>
              </div>

              <!-- Controls -->
              <div class="flex-1 space-y-1.5">
                <div>
                  <input type="file" id="swal-img-file" accept="image/*" class="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer">
                </div>
                <div>
                  <input id="swal-img-url" class="swal2-input !m-0 !w-full !text-xs !h-8" placeholder="অথবা ইমেজের অনলাইন লিঙ্ক (https://...)" value="${initialImg}">
                </div>
              </div>
            </div>
          </div>

          <!-- Description -->
          <div>
            <label class="font-black text-slate-800 block mb-1">Description: (বিবরণ ও বিবরণী)</label>
            <textarea id="swal-desc" class="swal2-textarea !m-0 !w-full !text-xs !h-20" placeholder="প্রোডাক্ট সম্পর্কে বিস্তারিত তথ্য লিখুন (যেমন: ফোন ভেরিফাইড, রিকভারি ইমেইল যুক্ত, নন-ড্রপ গ্যারান্টি)...">${product?.description || ''}</textarea>
          </div>

          <!-- Min/Max Order & Warranty -->
          <div class="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200">
            <div>
              <label class="font-bold text-slate-600 block mb-1">মিনিমাম অর্ডার:</label>
              <input id="swal-min" type="number" min="1" class="swal2-input !m-0 !w-full !text-xs" placeholder="Min" value="${product?.minOrder ?? 1}">
            </div>
            <div>
              <label class="font-bold text-slate-600 block mb-1">ম্যাক্সিমাম অর্ডার:</label>
              <input id="swal-max" type="number" min="1" class="swal2-input !m-0 !w-full !text-xs" placeholder="Max" value="${product?.maxOrder ?? 500}">
            </div>
            <div>
              <label class="font-bold text-slate-600 block mb-1">লাইভ ওয়ারেন্টি (ঘণ্টা):</label>
              <input id="swal-warranty" type="number" min="1" class="swal2-input !m-0 !w-full !text-xs" placeholder="Default 12" value="${product?.warrantyHours ?? 12}">
              <div class="flex items-center gap-1 mt-1">
                <button type="button" onclick="document.getElementById('swal-warranty').value=6" class="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold">6h</button>
                <button type="button" onclick="document.getElementById('swal-warranty').value=12" class="px-1.5 py-0.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded text-[10px] font-bold">12h (Default)</button>
                <button type="button" onclick="document.getElementById('swal-warranty').value=24" class="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold">24h</button>
              </div>
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: isEdit ? 'আপডেট করুন (Save Product)' : 'Save Product (সংরক্ষণ করুন)',
      cancelButtonText: 'বাতিল',
      confirmButtonColor: '#4f46e5',
      didOpen: () => {
        const fileInput = document.getElementById('swal-img-file') as HTMLInputElement;
        const urlInput = document.getElementById('swal-img-url') as HTMLInputElement;
        const previewImg = document.getElementById('swal-img-preview') as HTMLImageElement;
        const previewPlaceholder = document.getElementById('swal-img-placeholder') as HTMLElement;

        const updatePreview = (src: string) => {
          selectedImageBase64 = src;
          if (src) {
            previewImg.src = src;
            previewImg.classList.remove('hidden');
            previewPlaceholder.classList.add('hidden');
          } else {
            previewImg.src = '';
            previewImg.classList.add('hidden');
            previewPlaceholder.classList.remove('hidden');
          }
        };

        if (fileInput) {
          fileInput.addEventListener('change', (e: any) => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                  const canvas = document.createElement('canvas');
                  const MAX_WIDTH = 500;
                  const MAX_HEIGHT = 500;
                  let width = img.width;
                  let height = img.height;

                  if (width > height) {
                    if (width > MAX_WIDTH) {
                      height = Math.round(height * (MAX_WIDTH / width));
                      width = MAX_WIDTH;
                    }
                  } else {
                    if (height > MAX_HEIGHT) {
                      width = Math.round(width * (MAX_HEIGHT / height));
                      height = MAX_HEIGHT;
                    }
                  }

                  canvas.width = width;
                  canvas.height = height;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    const base64 = canvas.toDataURL('image/jpeg', 0.80);
                    if (urlInput) urlInput.value = '';
                    updatePreview(base64);
                  }
                };
                img.src = event.target?.result as string;
              };
              reader.readAsDataURL(file);
            }
          });
        }

        if (urlInput) {
          const handleUrlChange = () => {
            const val = urlInput.value.trim();
            updatePreview(val);
          };
          urlInput.addEventListener('input', handleUrlChange);
          urlInput.addEventListener('change', handleUrlChange);
        }
      },
      preConfirm: () => {
        const title = (document.getElementById('swal-title') as HTMLInputElement).value.trim();
        const banglaTitle = (document.getElementById('swal-btitle') as HTMLInputElement).value.trim();
        const category = (document.getElementById('swal-category') as HTMLSelectElement).value as any;
        const price = parseFloat((document.getElementById('swal-price') as HTMLInputElement).value) || 0;
        const stock = parseInt((document.getElementById('swal-stock') as HTMLInputElement).value) || 0;
        const minOrder = parseInt((document.getElementById('swal-min') as HTMLInputElement).value) || 1;
        const maxOrder = parseInt((document.getElementById('swal-max') as HTMLInputElement).value) || 1000;
        const warrantyHours = parseInt((document.getElementById('swal-warranty') as HTMLInputElement).value) || 12;
        const description = (document.getElementById('swal-desc') as HTMLTextAreaElement).value.trim();
        const active = (document.getElementById('swal-active') as HTMLInputElement).checked;
        const urlValue = (document.getElementById('swal-img-url') as HTMLInputElement)?.value.trim() || '';

        let image = urlValue || selectedImageBase64 || '';
        if (selectedImageBase64 && selectedImageBase64.startsWith('data:image')) {
          image = selectedImageBase64;
        }

        if (!title) {
          Swal.showValidationMessage('Product Name / Title দেওয়া আবশ্যক!');
          return false;
        }
        if (price <= 0) {
          Swal.showValidationMessage('সঠিক মূল্য (Price) দিন!');
          return false;
        }

        return {
          title,
          banglaTitle,
          category,
          price,
          stock,
          image,
          imageUrl: image,
          minOrder,
          maxOrder,
          warrantyHours,
          format: product?.format || 'email:password:recovery',
          description,
          active: active !== false,
          updatedAt: Date.now()
        };
      }
    }).then(async (result) => {
      if (result.isConfirmed && result.value) {
        try {
          if (isEdit && product) {
            const updatePayload = {
              id: product.id,
              ...result.value
            };

            // 1. Call Backend API
            try {
              await fetch(`/api/admin/products/${product.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload)
              });
            } catch (apiErr) {
              console.warn('API update product warning:', apiErr);
            }

            // 2. Direct RTDB update safely
            try {
              await update(ref(db, `buyer_products/${product.id}`), updatePayload);
              await update(ref(db, `products/${product.id}`), updatePayload);
            } catch (rtdbErr) {
              console.warn('RTDB update product notice:', rtdbErr);
            }

            Swal.fire({
              icon: 'success',
              title: 'আপডেট সম্পন্ন!',
              text: 'প্রোডাক্ট এবং স্টক মার্কেটপ্লেসে আপডেট হয়ে গেছে।',
              confirmButtonColor: '#4f46e5'
            });
          } else {
            const newRef = push(ref(db, 'buyer_products'));
            const newKey = newRef.key || `prod_${Date.now()}`;
            const payload = {
              id: newKey,
              ...result.value,
              createdAt: Date.now()
            };

            // 1. Call Backend API
            try {
              await fetch('/api/admin/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              });
            } catch (apiErr) {
              console.warn('API create product warning:', apiErr);
            }

            // 2. Direct RTDB set safely
            try {
              await set(ref(db, `buyer_products/${newKey}`), payload);
              await set(ref(db, `products/${newKey}`), payload);
            } catch (rtdbErr) {
              console.warn('RTDB set product notice:', rtdbErr);
            }

            Swal.fire({
              icon: 'success',
              title: 'Done! প্রোডাক্ট সফলভাবে পোস্ট হয়েছে! 🎉',
              text: 'সাথে সাথেই Buyer এর Marketplace পেজে প্রোডাক্টটি যুক্ত হয়ে গেছে।',
              confirmButtonColor: '#10b981'
            });
          }
        } catch (e: any) {
          console.error(e);
          Swal.fire('Error', e.message || 'Failed to save product', 'error');
        }
      }
    });
  };

  // Toggle Active/Inactive
  const handleToggleActive = async (p: BuyerProduct) => {
    try {
      const updatedActive = p.active === false ? true : false;
      
      // 1. Backend API update
      try {
        await fetch(`/api/admin/products/${p.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ active: updatedActive, updatedAt: Date.now() })
        });
      } catch (apiErr) {
        console.warn('API toggle active warning:', apiErr);
      }

      // 2. Direct RTDB update
      try {
        await update(ref(db, `buyer_products/${p.id}`), { active: updatedActive, updatedAt: Date.now() });
        await update(ref(db, `products/${p.id}`), { active: updatedActive, updatedAt: Date.now() });
      } catch (rtdbErr) {
        console.warn('RTDB toggle active notice:', rtdbErr);
      }
    } catch (e: any) {
      console.error(e);
      Swal.fire('Error', 'Failed to toggle status', 'error');
    }
  };

  // Delete Product
  const handleDeleteProduct = (p: BuyerProduct) => {
    Swal.fire({
      title: 'প্রোডাক্ট ডিলিট করবেন?',
      text: `"${p.title}" প্রোডাক্ট এবং এর সাথে সম্পর্কিত স্টক মুছে যাবে।`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'হ্যাঁ, ডিলিট করুন',
      cancelButtonText: 'বাতিল',
      confirmButtonColor: '#ef4444'
    }).then(async (res) => {
      if (res.isConfirmed) {
        try {
          // 1. Backend API delete
          try {
            await fetch(`/api/admin/products/${p.id}`, { method: 'DELETE' });
          } catch (apiErr) {
            console.warn('API delete product warning:', apiErr);
          }

          // 2. Direct RTDB remove
          try {
            await remove(ref(db, `buyer_products/${p.id}`));
            await remove(ref(db, `products/${p.id}`));
            await remove(ref(db, `buyer_credentials_bank/${p.id}`));
          } catch (rtdbErr) {
            console.warn('RTDB remove product notice:', rtdbErr);
          }

          Swal.fire('ডিলিট হয়েছে', 'প্রোডাক্ট মুছে ফেলা হয়েছে।', 'success');
          if (selectedProductForBank?.id === p.id) {
            setSelectedProductForBank(null);
          }
        } catch (e: any) {
          console.error(e);
          Swal.fire('Error', e.message || 'Failed to delete product', 'error');
        }
      }
    });
  };

  // Bulk Upload Credentials Modal
  const handleBulkUploadCredentials = (p: BuyerProduct) => {
    Swal.fire({
      title: `স্টক আপলোড করুন: ${p.title}`,
      width: '650px',
      html: `
        <div class="text-left space-y-3 text-xs">
          <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-indigo-900">
            <div class="font-bold flex items-center gap-1.5 mb-1">
              <Sparkles size={14} className="text-indigo-600" />
              <span>ফরম্যাট নির্দেশিকা (${p.format || 'email:password:recovery'}):</span>
            </div>
            <p class="text-[11px] text-indigo-800">
              প্রতি লাইনে একটি করে অ্যাকাউন্ট পেস্ট করুন। ফরম্যাট হতে পারে:
              <br /><code class="font-mono bg-white px-1.5 py-0.5 rounded border">email:password:recovery</code> অথবা <code class="font-mono bg-white px-1.5 py-0.5 rounded border">email|pass|recovery</code>
            </p>
          </div>

          <div>
            <label class="font-bold text-slate-700 block mb-1">অ্যাকাউন্ট লিস্ট পেস্ট করুন (Paste Bulk Accounts) *</label>
            <textarea 
              id="swal-bulk-creds" 
              class="swal2-textarea !m-0 !w-full !text-xs !font-mono !h-48 leading-relaxed" 
              placeholder="example1@gmail.com:pass123:recovery1@mail.com&#10;example2@gmail.com:pass456:recovery2@mail.com&#10;example3@gmail.com:pass789:recovery3@mail.com"
            ></textarea>
          </div>

          <div class="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <span>ডুপ্লিকেট ও খালি লাইন সিস্টেম স্বয়ংক্রিয়ভাবে ফিল্টার করবে।</span>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'স্টক ভ্যালিডেট ও আপলোড করুন',
      cancelButtonText: 'বাতিল',
      confirmButtonColor: '#4f46e5',
      preConfirm: () => {
        const raw = (document.getElementById('swal-bulk-creds') as HTMLTextAreaElement).value.trim();
        if (!raw) {
          Swal.showValidationMessage('কমপক্ষে ১টি অ্যাকাউন্ট পেস্ট করুন!');
          return false;
        }

        const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
        const parsed: Array<{ email: string; password: string; recovery?: string; ip?: string; raw: string }> = [];

        for (const line of lines) {
          let delimiter = ':';
          if (line.includes('|')) delimiter = '|';
          else if (line.includes('\t')) delimiter = '\t';
          else if (line.includes(',')) delimiter = ',';

          const parts = line.split(delimiter).map(p => p.trim());
          if (parts.length >= 2) {
            const email = parts[0];
            const password = parts[1];
            const recovery = parts[2] || '';
            const ip = parts[3] || '';

            if (email.includes('@')) {
              parsed.push({ email, password, recovery, ip, raw: line });
            }
          }
        }

        if (parsed.length === 0) {
          Swal.showValidationMessage('কোনো বৈধ ইমেইল ও পাসওয়ার্ড পাওয়া যায়নি! অনুগ্রহ করে ফরম্যাট চেক করুন।');
          return false;
        }

        return parsed;
      }
    }).then(async (res) => {
      if (res.isConfirmed && res.value) {
        const parsedAccounts = res.value;
        try {
          Swal.fire({
            title: 'আপলোড হচ্ছে...',
            text: `${parsedAccounts.length} টি অ্যাকাউন্ট স্টক ব্যাংকে যোগ করা হচ্ছে`,
            allowOutsideClick: false,
            didOpen: () => {
              Swal.showLoading();
            }
          });

          const updates: Record<string, any> = {};
          const now = Date.now();

          parsedAccounts.forEach((acc: any) => {
            const credId = push(ref(db, `buyer_credentials_bank/${p.id}`)).key;
            if (credId) {
              updates[`buyer_credentials_bank/${p.id}/${credId}`] = {
                productId: p.id,
                email: acc.email,
                password: acc.password,
                recovery: acc.recovery || '',
                ip: acc.ip || '',
                status: 'available',
                addedAt: now
              };
            }
          });

          await update(ref(db), updates);

          // Recalculate stock
          const bankSnap = await get(ref(db, `buyer_credentials_bank/${p.id}`));
          let newStock = 0;
          if (bankSnap.exists()) {
            const bVal = bankSnap.val();
            newStock = Object.values(bVal).filter((c: any) => c.status === 'available' || !c.status).length;
          }
          await update(ref(db, `buyer_products/${p.id}`), { stock: newStock, updatedAt: now });
          try { await update(ref(db, `products/${p.id}`), { stock: newStock, updatedAt: now }); } catch (_) {}

          Swal.fire({
            icon: 'success',
            title: 'সফলভাবে আপলোড সম্পন্ন!',
            text: `${parsedAccounts.length} টি অ্যাকাউন্ট ইনভেন্টরিতে যোগ করা হয়েছে। বর্তমান স্টক: ${newStock} টি।`,
            confirmButtonColor: '#4f46e5'
          });
        } catch (e: any) {
          console.error(e);
          Swal.fire('Error', e.message || 'Failed to upload credentials', 'error');
        }
      }
    });
  };

  // Manage Credentials for selected product
  const currentProductBankList = useMemo(() => {
    if (!selectedProductForBank) return [];
    const pBank = credentialsBank[selectedProductForBank.id] || {};
    let list: BuyerCredential[] = Object.keys(pBank).map(k => ({ id: k, ...pBank[k] }));

    if (bankTab === 'available') {
      list = list.filter(c => c.status === 'available' || !c.status);
    } else if (bankTab === 'sold') {
      list = list.filter(c => c.status === 'sold');
    }

    if (bankSearch.trim()) {
      const q = bankSearch.toLowerCase().trim();
      list = list.filter(c => 
        c.email.toLowerCase().includes(q) || 
        (c.recovery || '').toLowerCase().includes(q) ||
        (c.soldToOrderId || '').toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
  }, [selectedProductForBank, credentialsBank, bankTab, bankSearch]);

  const handleDeleteSingleCredential = async (credId: string) => {
    if (!selectedProductForBank) return;
    try {
      await remove(ref(db, `buyer_credentials_bank/${selectedProductForBank.id}/${credId}`));
      
      // Update stock
      const bankSnap = await get(ref(db, `buyer_credentials_bank/${selectedProductForBank.id}`));
      let newStock = 0;
      if (bankSnap.exists()) {
        const bVal = bankSnap.val();
        newStock = Object.values(bVal).filter((c: any) => c.status === 'available' || !c.status).length;
      }
      await update(ref(db, `buyer_products/${selectedProductForBank.id}`), { stock: newStock, updatedAt: Date.now() });
      try { await update(ref(db, `products/${selectedProductForBank.id}`), { stock: newStock, updatedAt: Date.now() }); } catch (_) {}

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'অ্যাকাউন্ট ডিলিট করা হয়েছে',
        showConfirmButton: false,
        timer: 1500
      });
    } catch (e: any) {
      console.error(e);
      Swal.fire('Error', 'Failed to delete credential', 'error');
    }
  };

  const handleExportBankText = () => {
    if (!selectedProductForBank || currentProductBankList.length === 0) return;
    const lines = currentProductBankList.map(c => `${c.email}:${c.password}:${c.recovery || ''}${c.ip ? ':' + c.ip : ''}`);
    const text = lines.join('\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedProductForBank.title.replace(/[^a-z0-9]/gi, '_')}_${bankTab}_credentials.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-black uppercase">
              Admin Inventory Engine
            </span>
            <span className="text-xs text-slate-400 font-bold">•</span>
            <span className="text-xs text-slate-500 font-bold">{enrichedProducts.length} টি প্রোডাক্ট</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">Marketplace Products & Credentials Bank</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            বিক্রয়ের জন্য প্রোডাক্ট তৈরি করুন, স্টক রেট নির্ধারণ করুন এবং ক্রেতাদের জন্য অটো-ডেলিভারি স্টক ব্যাংক পরিচালনা করুন।
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {products.length === 0 && (
            <button
              onClick={handleSeedStarters}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 font-black text-xs transition-all active:scale-95 shadow-xs"
            >
              <Sparkles size={14} className="text-amber-600" />
              <span>ডিফল্ট প্রোডাক্ট লোড করুন</span>
            </button>
          )}

          <button
            onClick={() => handleOpenProductModal()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm shadow-md shadow-indigo-600/25 transition-all active:scale-95"
          >
            <Plus size={16} />
            <span>নতুন প্রোডাক্ট যোগ করুন</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['all', 'aged', 'fresh', 'usa', 'recovery', 'bulk'].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black capitalize transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80'
              }`}
            >
              {cat === 'all' ? 'সকল ক্যাটাগরি' : cat}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="প্রোডাক্ট খুঁজুন..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto shadow-inner">
            <Package size={32} />
          </div>
          <h3 className="font-black text-slate-800 text-base">কোনো প্রোডাক্ট পাওয়া যায়নি</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            মার্কেটপ্লেসে ক্রেতাদের জন্য এখনো কোনো জিমেইল প্যাকেজ তৈরি করা হয়নি। "নতুন প্রোডাক্ট যোগ করুন" বাটনে ক্লিক করে প্রথম প্রোডাক্ট তৈরি করুন।
          </p>
          <button
            onClick={() => handleOpenProductModal()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-indigo-700 transition-all"
          >
            <Plus size={14} />
            <span>নতুন প্রোডাক্ট তৈরি করুন</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredProducts.map(product => {
            const hasStock = (product.liveStock || 0) > 0;
            return (
              <div
                key={product.id}
                className={`bg-white rounded-3xl border-2 transition-all duration-200 overflow-hidden flex flex-col justify-between ${
                  product.active === false
                    ? 'border-slate-200 opacity-75 bg-slate-50/50'
                    : hasStock
                    ? 'border-slate-200 hover:border-indigo-300 shadow-sm hover:shadow-md'
                    : 'border-amber-200/80 bg-amber-50/10 shadow-sm'
                }`}
              >
                {/* Product Image (if available) */}
                {(product.image || product.imageUrl) && (
                  <div className="w-full h-36 bg-slate-100 overflow-hidden relative border-b border-slate-100">
                    <img 
                      src={product.image || product.imageUrl} 
                      alt={product.title} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                {/* Card Header */}
                <div className="p-5 pb-3 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                        product.category === 'aged'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : product.category === 'fresh'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : product.category === 'usa'
                          ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {product.category}
                      </span>

                      {product.badge && (
                        <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-black">
                          {product.badge}
                        </span>
                      )}
                    </div>

                    {/* Active toggle */}
                    <button
                      onClick={() => handleToggleActive(product)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black flex items-center gap-1 transition-all ${
                        product.active !== false
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-200 text-slate-600 border border-slate-300'
                      }`}
                      title={product.active !== false ? 'Active: Click to Deactivate' : 'Inactive: Click to Activate'}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${product.active !== false ? 'bg-emerald-600' : 'bg-slate-500'}`}></span>
                      <span>{product.active !== false ? 'Active' : 'Disabled'}</span>
                    </button>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 leading-snug">{product.title}</h3>
                    {product.banglaTitle && (
                      <div className="text-xs font-bold text-slate-500 mt-0.5">{product.banglaTitle}</div>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-medium">
                    {product.description || 'No description provided.'}
                  </p>

                  {/* Pricing & Stock Stats */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/70 text-center">
                      <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">প্রতি পিস মূল্য</div>
                      <div className="text-lg font-black text-indigo-700">৳ {product.price}</div>
                    </div>

                    <div className={`rounded-2xl p-3 border text-center ${
                      hasStock 
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' 
                        : 'bg-red-50/70 border-red-200 text-red-900'
                    }`}>
                      <div className="text-[10px] font-black uppercase tracking-wider opacity-75">অটো-স্টক ব্যাংক</div>
                      <div className="text-lg font-black flex items-center justify-center gap-1">
                        <Database size={15} />
                        <span>{product.liveStock || 0} পিস</span>
                      </div>
                    </div>
                  </div>

                  {/* Limits & Warranty Info */}
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 px-1 pt-1">
                    <span className="flex items-center gap-1">
                      <Tag size={12} className="text-slate-400" />
                      <span>অর্ডার: {product.minOrder || 1} - {product.maxOrder || 500} টি</span>
                    </span>

                    <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                      <ShieldCheck size={13} className="text-emerald-600" />
                      <span>{product.warrantyHours ? `${product.warrantyHours}h` : '6-12h'} লাইভ ওয়ারেন্টি</span>
                    </span>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleBulkUploadCredentials(product)}
                      className="inline-flex items-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition-all active:scale-95"
                      title="অ্যাকাউন্ট স্টক আপলোড করুন"
                    >
                      <Upload size={13} />
                      <span>স্টক আপলোড</span>
                    </button>

                    <button
                      onClick={() => setSelectedProductForBank(product)}
                      className="inline-flex items-center gap-1 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-black transition-all"
                      title="স্টক ব্যাংক ভিউ ও পরিচালনা"
                    >
                      <Database size={13} />
                      <span>ব্যাংক ({product.totalLoaded || 0})</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenProductModal(product)}
                      className="w-8 h-8 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-all shadow-xs"
                      title="প্রোডাক্ট এডিট করুন"
                    >
                      <Edit3 size={14} />
                    </button>

                    <button
                      onClick={() => handleDeleteProduct(product)}
                      className="w-8 h-8 rounded-xl bg-white border border-slate-200 hover:bg-red-50 hover:text-red-600 text-slate-400 flex items-center justify-center transition-all shadow-xs"
                      title="প্রোডাক্ট ডিলিট করুন"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Product Credentials Bank Drawer / Modal */}
      {selectedProductForBank && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
                  <Database size={22} />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-wider text-indigo-300">Credentials Stock Bank</div>
                  <h3 className="text-lg font-black text-white truncate">{selectedProductForBank.title}</h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleBulkUploadCredentials(selectedProductForBank)}
                  className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs shadow-xs transition-all"
                >
                  <Plus size={14} />
                  <span>আরও আপলোড</span>
                </button>

                <button
                  onClick={() => setSelectedProductForBank(null)}
                  className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-all"
                >
                  <XCircle size={18} />
                </button>
              </div>
            </div>

            {/* Filter Bar inside Bank */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-xl">
                <button
                  onClick={() => setBankTab('available')}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                    bankTab === 'available' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Available Stock
                </button>
                <button
                  onClick={() => setBankTab('sold')}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                    bankTab === 'sold' ? 'bg-white text-indigo-800 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Sold Accounts
                </button>
                <button
                  onClick={() => setBankTab('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                    bankTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  All ({Object.keys(credentialsBank[selectedProductForBank.id] || {}).length})
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative min-w-[200px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ইমেইল দিয়ে খুঁজুন..."
                    value={bankSearch}
                    onChange={(e) => setBankSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <button
                  onClick={handleExportBankText}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs"
                  title="টেক্সট ফাইল হিসেবে ডাউনলোড করুন"
                >
                  <Download size={13} />
                  <span>Export TXT</span>
                </button>
              </div>
            </div>

            {/* Credential List Table */}
            <div className="flex-1 overflow-y-auto p-4">
              {currentProductBankList.length === 0 ? (
                <div className="text-center py-16 text-slate-400 space-y-2">
                  <Database size={36} className="mx-auto text-slate-300" />
                  <p className="text-xs font-bold">এই ট্যাবে কোনো অ্যাকাউন্ট পাওয়া যায়নি।</p>
                  <button
                    onClick={() => handleBulkUploadCredentials(selectedProductForBank)}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-black"
                  >
                    স্টক আপলোড করুন
                  </button>
                </div>
              ) : (
                <div className="space-y-2 font-mono text-xs">
                  {currentProductBankList.map(item => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                        item.status === 'sold'
                          ? 'bg-slate-50 border-slate-200 text-slate-500'
                          : 'bg-white border-emerald-100 shadow-xs text-slate-800'
                      }`}
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm select-all">{item.email}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                            item.status === 'sold' ? 'bg-slate-200 text-slate-700' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {item.status === 'sold' ? 'Sold' : 'Available'}
                          </span>
                          {item.soldToOrderId && (
                            <span className="text-[10px] text-indigo-600 font-sans font-bold">
                              Order: {item.soldToOrderId}
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-600 flex items-center gap-3 flex-wrap">
                          <span>Pass: <strong className="text-slate-900 select-all">{item.password}</strong></span>
                          {item.recovery && (
                            <span>Recovery: <strong className="text-indigo-700 select-all">{item.recovery}</strong></span>
                          )}
                          {item.ip && <span>IP: <strong>{item.ip}</strong></span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                        <button
                          onClick={() => {
                            copyToClipboardFallback(`${item.email}:${item.password}:${item.recovery || ''}`);
                            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'কপি হয়েছে!', showConfirmButton: false, timer: 1000 });
                          }}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
                          title="Copy format"
                        >
                          <Copy size={13} />
                        </button>

                        <button
                          onClick={() => handleDeleteSingleCredential(item.id)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-red-100 hover:text-red-600 text-slate-400"
                          title="ডিলিট করুন"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <span>মোট অ্যাকাউন্ট: <strong>{currentProductBankList.length} টি</strong></span>
              <button
                onClick={() => setSelectedProductForBank(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
